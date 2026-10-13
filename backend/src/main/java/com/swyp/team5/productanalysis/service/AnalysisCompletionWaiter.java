package com.swyp.team5.productanalysis.service;

import java.time.Duration;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.BlockingQueue;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.LinkedBlockingQueue;
import java.util.concurrent.TimeUnit;
import java.util.function.BooleanSupplier;
import java.util.function.Consumer;

import org.springframework.stereotype.Component;

import com.swyp.team5.productanalysis.dto.AnalysisPerspective;
import com.swyp.team5.productanalysis.dto.AnalysisStepEvent;
import com.swyp.team5.productanalysis.dto.ProductAnalysisResponse;

/**
 * 진행 중인 시세 분석이 끝나길 호출한 스레드에서 기다리며 진행 단계를 넘겨준다. 상품 등록 스트림이 상품 저장 뒤 등록 직후 분석(대기열)을
 * 이어서 보여 주기 위함이다. 분석 결과 구독 스트림({@link AnalysisStreamService})과 같은 진행 기록({@link AnalysisProgressTracker})을
 * 쓰며, 분석 종료를 놓치지 않도록 대기를 먼저 등록한 뒤 진행 여부를 확인한다.
 *
 * <p>진행 기록은 서버 메모리에만 있으므로 분석을 실행한 서버에서만 기다릴 수 있다(진행 기록과 같은 한계).
 */
@Component
public class AnalysisCompletionWaiter {

    // 분석 종료 표시(단계 이벤트와 같은 대기열에 넣어 순서를 지킨다)
    private static final Object FINISHED = new Object();
    // 중단 여부를 확인하는 간격
    private static final long POLL_MILLIS = 500;

    private final ProductAnalysisService productAnalysisService;
    private final AnalysisProgressTracker progressTracker;
    private final Map<Long, Set<BlockingQueue<Object>>> waiters = new ConcurrentHashMap<>();

    public AnalysisCompletionWaiter(
            ProductAnalysisService productAnalysisService, AnalysisProgressTracker progressTracker) {
        this.productAnalysisService = productAnalysisService;
        this.progressTracker = progressTracker;
        progressTracker.onStep((itemId, event) -> offer(itemId, event));
        progressTracker.onFinished(itemId -> offer(itemId, FINISHED));
    }

    /**
     * 대상의 분석이 진행 중(대기열 포함)이면 끝날 때까지 기다리며 단계가 바뀔 때마다 {@code onStep}을 부르고(첫 단계 전이면 대기
     * {@code WAITING}부터), 끝나면 최신 결과(판매자 관점)를 돌려준다. 분석 중이 아니면 기다리지 않고 바로 최신 결과를 돌려준다.
     * {@code timeout}이 지나거나 {@code stop}이 참이 되면 기다리기를 멈추고 그때의 결과(아직 분석 중이면 {@code analysisStatus}가
     * ANALYZING)를 돌려준다. 분석 자체는 멈추지 않는다.
     *
     * @param itemId 상품 ID
     * @param timeout 최대 대기 시간
     * @param onStep 단계 이벤트를 받을 함수(기다리는 스레드에서 호출, 늦게 도착한 이전 단계는 거른다)
     * @param stop 더 기다릴 필요가 없는지(예: 클라이언트 연결 끊김)
     * @return 대상의 최신 시세 분석 결과(판매자 관점)
     */
    public ProductAnalysisResponse await(
            Long itemId, Duration timeout, Consumer<AnalysisStepEvent> onStep, BooleanSupplier stop) {
        BlockingQueue<Object> queue = new LinkedBlockingQueue<>();
        waiters.computeIfAbsent(itemId, id -> ConcurrentHashMap.newKeySet()).add(queue);
        try {
            if (progressTracker.isInProgress(itemId)) {
                AnalysisStepEvent current = progressTracker.currentStep(itemId).orElseGet(AnalysisStepEvent::waiting);
                onStep.accept(current);
                waitUntilFinished(queue, timeout, onStep, stop, current.progressRank());
            }
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        } finally {
            waiters.computeIfPresent(itemId, (id, set) -> {
                set.remove(queue);
                return set.isEmpty() ? null : set;
            });
        }
        return productAnalysisService.getLatestAnalysis(itemId, AnalysisPerspective.SELL);
    }

    private static void waitUntilFinished(
            BlockingQueue<Object> queue,
            Duration timeout,
            Consumer<AnalysisStepEvent> onStep,
            BooleanSupplier stop,
            int lastRank)
            throws InterruptedException {
        long deadline = System.nanoTime() + timeout.toNanos();
        while (!stop.getAsBoolean()) {
            long remaining = deadline - System.nanoTime();
            if (remaining <= 0) {
                return;
            }
            Object item =
                    queue.poll(Math.min(remaining, TimeUnit.MILLISECONDS.toNanos(POLL_MILLIS)), TimeUnit.NANOSECONDS);
            if (item == FINISHED) {
                return;
            }
            if (item instanceof AnalysisStepEvent event && event.progressRank() > lastRank) {
                lastRank = event.progressRank();
                onStep.accept(event);
            }
        }
    }

    private void offer(Long itemId, Object item) {
        Set<BlockingQueue<Object>> queues = waiters.get(itemId);
        if (queues != null) {
            queues.forEach(queue -> queue.offer(item));
        }
    }
}
