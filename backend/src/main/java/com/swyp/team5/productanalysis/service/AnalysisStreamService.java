package com.swyp.team5.productanalysis.service;

import java.io.IOException;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.ScheduledFuture;
import java.util.concurrent.TimeUnit;

import lombok.extern.slf4j.Slf4j;

import org.springframework.beans.factory.DisposableBean;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import com.swyp.team5.common.common.ApiResponse;
import com.swyp.team5.product.error.ProductNotFoundException;
import com.swyp.team5.productanalysis.config.AnalysisStreamProperties;
import com.swyp.team5.productanalysis.dto.AnalysisCompleteEvent;
import com.swyp.team5.productanalysis.dto.AnalysisPerspective;
import com.swyp.team5.productanalysis.dto.AnalysisStepEvent;
import com.swyp.team5.productanalysis.dto.ProductAnalysisResponse;

/**
 * 시세 분석 진행 단계와 결과를 SSE로 보낸다. 화면이 분석 요청(202, ANALYZING)이나 상품 등록 뒤에 결과를 반복 조회하지 않고, 분석이
 * 실제로 진행되는 모습을 보며 스트림 하나로 기다리게 하기 위함이다.
 *
 * <p>이벤트는 상품 등록 스트림과 같이 {@code data:} 줄만 쓰고 종류는 {@code data.event}로 구분한다. 분석 중이면 구독 직후 지금 단계
 * (첫 단계 전이면 대기 {@code WAITING})를, 이후 단계가 바뀔 때마다 {@code step}({@link AnalysisStepEvent})을 보내고, 분석이 끝나면
 * {@code complete}({@link AnalysisCompleteEvent} — {@code GET /products/{id}/analysis}와 같은 필드)를 보내고 닫는다. 분석 중이
 * 아니면 {@code complete}만 바로 보내고 닫는다. 스트림 시간이 지나면 그때의 결과(아직 분석 중이면 {@code analysisStatus}가
 * ANALYZING)를 {@code complete}로 보내고 닫는다.
 *
 * <p>구독은 서버 메모리에만 두므로 서버를 여러 대 띄우면 분석을 실행한 서버에 연결된 구독만 알림을 받는다(진행 기록과 같은 한계).
 */
@Slf4j
@Service
public class AnalysisStreamService implements DisposableBean {

    private final ProductAnalysisService productAnalysisService;
    private final AnalysisProgressTracker progressTracker;
    private final AnalysisStreamProperties properties;
    private final Map<Long, Set<Subscription>> subscriptions = new ConcurrentHashMap<>();
    private final ScheduledExecutorService keepAliveScheduler;

    public AnalysisStreamService(
            ProductAnalysisService productAnalysisService,
            AnalysisProgressTracker progressTracker,
            AnalysisStreamProperties properties) {
        this.productAnalysisService = productAnalysisService;
        this.progressTracker = progressTracker;
        this.properties = properties;
        this.keepAliveScheduler = Executors.newSingleThreadScheduledExecutor(runnable -> {
            Thread thread = new Thread(runnable, "analysis-stream-keepalive");
            thread.setDaemon(true);
            return thread;
        });
        progressTracker.onFinished(this::publish);
        progressTracker.onStep(this::publishStep);
    }

    /**
     * 대상의 분석 결과를 구독한다. 분석 종료를 놓치지 않도록 구독을 먼저 등록한 뒤 진행 여부를 확인한다.
     *
     * @param itemId 상품 ID(외부 매물 ID 포함)
     * @param perspective 결과 관점(SELL 판매자, BUY 구매자)
     * @return 분석 결과 1건을 보내고 닫히는 SSE 스트림
     * @throws ProductNotFoundException 존재하지 않는 상품(외부 매물 포함)인 경우(스트림 시작 전)
     */
    public SseEmitter subscribe(Long itemId, AnalysisPerspective perspective) {
        productAnalysisService.getLatestAnalysis(itemId, perspective);
        SseEmitter emitter = new SseEmitter(properties.timeout().toMillis());
        Subscription subscription = new Subscription(itemId, perspective, emitter);
        subscriptions
                .computeIfAbsent(itemId, id -> ConcurrentHashMap.newKeySet())
                .add(subscription);
        emitter.onTimeout(() -> sendLatestAndClose(subscription));
        emitter.onCompletion(() -> remove(subscription));
        emitter.onError(error -> remove(subscription));
        long interval = properties.keepAliveInterval().toMillis();
        subscription.keepAlive =
                keepAliveScheduler.scheduleAtFixedRate(subscription::ping, interval, interval, TimeUnit.MILLISECONDS);
        if (!progressTracker.isInProgress(itemId)) {
            sendLatestAndClose(subscription);
        } else {
            // 이 사이에 단계가 바뀌어 새 단계가 먼저 갔으면 Subscription이 이 이벤트를 버린다
            subscription.sendStep(progressTracker.currentStep(itemId).orElseGet(AnalysisStepEvent::waiting));
        }
        return emitter;
    }

    /** 대상의 분석이 끝나면 구독 중인 스트림마다 최신 결과를 보내고 닫는다(분석 스레드에서 호출). */
    void publish(Long itemId) {
        Set<Subscription> targets = subscriptions.remove(itemId);
        if (targets != null) {
            targets.forEach(this::sendLatestAndClose);
        }
    }

    /** 대상의 분석 단계가 바뀌면 구독 중인 스트림마다 단계 이벤트를 보낸다(분석 스레드에서 호출). */
    void publishStep(Long itemId, AnalysisStepEvent event) {
        Set<Subscription> targets = subscriptions.get(itemId);
        if (targets != null) {
            targets.forEach(subscription -> subscription.sendStep(event));
        }
    }

    private void sendLatestAndClose(Subscription subscription) {
        try {
            ProductAnalysisResponse latest =
                    productAnalysisService.getLatestAnalysis(subscription.itemId, subscription.perspective);
            subscription.sendAndClose(ApiResponse.success(AnalysisCompleteEvent.of(latest)));
        } catch (RuntimeException e) {
            log.warn("분석 결과 스트림 전송 중 오류가 발생했습니다: itemId={}", subscription.itemId, e);
            subscription.close();
        } finally {
            remove(subscription);
        }
    }

    private void remove(Subscription subscription) {
        subscription.cancelKeepAlive();
        subscriptions.computeIfPresent(subscription.itemId, (id, set) -> {
            set.remove(subscription);
            return set.isEmpty() ? null : set;
        });
    }

    @Override
    public void destroy() {
        keepAliveScheduler.shutdownNow();
    }

    private static final class Subscription {

        private final Long itemId;
        private final AnalysisPerspective perspective;
        private final SseEmitter emitter;
        private volatile ScheduledFuture<?> keepAlive;
        private boolean closed;
        private int lastStepRank = -1; // 이미 보낸 단계(늦게 도착한 이전 단계는 보내지 않음)

        private Subscription(Long itemId, AnalysisPerspective perspective, SseEmitter emitter) {
            this.itemId = itemId;
            this.perspective = perspective;
            this.emitter = emitter;
        }

        synchronized void sendStep(AnalysisStepEvent event) {
            if (closed || event.progressRank() <= lastStepRank) {
                return;
            }
            lastStepRank = event.progressRank();
            try {
                emitter.send(SseEmitter.event()
                        .data(ApiResponse.success(event.message(), event), MediaType.APPLICATION_JSON));
            } catch (IOException | IllegalStateException e) {
                log.debug("분석 단계 SSE 전송 실패(연결 종료): reason={}", e.getMessage());
                close();
            }
        }

        synchronized void sendAndClose(ApiResponse<?> response) {
            if (closed) {
                return;
            }
            try {
                emitter.send(SseEmitter.event().data(response, MediaType.APPLICATION_JSON));
            } catch (IOException | IllegalStateException e) {
                log.debug("분석 결과 SSE 전송 실패(연결 종료): reason={}", e.getMessage());
            }
            close();
        }

        synchronized void ping() {
            if (closed) {
                // 구독 직후 바로 닫힌 경우 예약이 닫힌 뒤에 걸릴 수 있어 여기서도 멈춘다
                cancelKeepAlive();
                return;
            }
            try {
                emitter.send(SseEmitter.event().comment("ping"));
            } catch (IOException | IllegalStateException e) {
                close();
            }
        }

        synchronized void close() {
            if (closed) {
                return;
            }
            closed = true;
            cancelKeepAlive();
            try {
                emitter.complete();
            } catch (IllegalStateException e) {
                log.debug("분석 결과 SSE 종료 실패(이미 종료됨): {}", e.getMessage());
            }
        }

        void cancelKeepAlive() {
            ScheduledFuture<?> future = keepAlive;
            if (future != null) {
                future.cancel(false);
            }
        }
    }
}
