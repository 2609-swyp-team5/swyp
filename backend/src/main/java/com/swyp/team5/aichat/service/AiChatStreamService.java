package com.swyp.team5.aichat.service;

import java.io.IOException;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.ScheduledFuture;
import java.util.concurrent.TimeUnit;

import lombok.extern.slf4j.Slf4j;

import org.springframework.beans.factory.DisposableBean;
import org.springframework.core.task.TaskRejectedException;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;
import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import com.swyp.team5.aichat.config.AiChatStreamProperties;
import com.swyp.team5.aichat.dto.AiChatAnswerResponse;
import com.swyp.team5.aichat.dto.AiChatStep;
import com.swyp.team5.aichat.dto.AiChatStreamEvent;
import com.swyp.team5.aichat.error.AiChatBusyException;
import com.swyp.team5.aichat.service.AiChatService.PendingQuestion;
import com.swyp.team5.common.common.ApiError;
import com.swyp.team5.common.common.ApiResponse;

/**
 * AI 대화 답변을 단계별로 SSE로 보낸다. 답변이 15초 남짓 걸려, 화면이 진행 단계(질문 이해 → 매물·시세 찾기 → 답변 작성)와 카드,
 * 답변 문장을 만들어지는 대로 보여 주게 하기 위함이다.
 *
 * <p>질문 저장·권한 확인은 호출 측이 스트림 전에 끝내고({@link AiChatService#saveNewChat} 등 — 404는 JSON으로), 여기서는 답변만
 * 별도 스레드에서 만든다. 이벤트는 상품 등록 스트림과 같이 {@code data:} 줄만 쓰고 종류는 {@code data.event}로 구분한다:
 * {@code step}(START/DONE/SKIP, 매물·시세 찾기 완료에 카드 결과) → {@code delta}(답변 문장 조각) → {@code complete}(JSON 응답과
 * 같은 필드) 또는 {@code error}.
 *
 * <p>연결이 끊기거나 스트림 시간이 지나도 답변은 끝까지 만들어 저장한다(AI 비용은 이미 들었고, 대화 열기로 다시 볼 수 있도록).
 */
@Slf4j
@Service
public class AiChatStreamService implements DisposableBean {

    private final AiChatService aiChatService;
    private final AiChatStreamProperties properties;
    private final ThreadPoolTaskExecutor executor;
    private final ScheduledExecutorService keepAliveScheduler;

    public AiChatStreamService(AiChatService aiChatService, AiChatStreamProperties properties) {
        this.aiChatService = aiChatService;
        this.properties = properties;
        // 스프링 빈으로 Executor를 등록하면 기본 applicationTaskExecutor 자동 설정이 꺼지므로 이 서비스 안에서만 쓴다
        this.executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(properties.corePoolSize());
        executor.setMaxPoolSize(properties.maxPoolSize());
        executor.setQueueCapacity(properties.queueCapacity());
        executor.setThreadNamePrefix("ai-chat-stream-");
        executor.setWaitForTasksToCompleteOnShutdown(true); // 종료 시 만들던 답변은 마저 저장한다
        executor.setAwaitTerminationSeconds((int) properties.timeout().toSeconds());
        executor.initialize();
        this.keepAliveScheduler = Executors.newSingleThreadScheduledExecutor(runnable -> {
            Thread thread = new Thread(runnable, "ai-chat-stream-keepalive");
            thread.setDaemon(true);
            return thread;
        });
    }

    /**
     * 저장된 질문에 대한 답변을 스트림으로 보낸다.
     *
     * @param memberId 질문한 회원 ID
     * @param pending 저장된 질문
     * @return 진행 상황·답변을 보내는 SSE 스트림
     * @throws AiChatBusyException 처리 대기열이 가득 찬 경우(스트림 시작 전)
     */
    public SseEmitter answer(Long memberId, PendingQuestion pending) {
        SseEmitter emitter = new SseEmitter(properties.timeout().toMillis());
        AnswerStream stream = new AnswerStream(emitter);
        emitter.onTimeout(() -> {
            log.warn("AI 대화 답변 스트림 시간 초과 - 답변은 계속 만들어 저장합니다. chatId={}", pending.chatId());
            stream.sendAndClose(errorResponse(
                    stream.currentStep,
                    HttpStatus.SERVICE_UNAVAILABLE,
                    "AI_CHAT_TIMEOUT",
                    "답변이 늦어지고 있어요. 잠시 후 대화를 다시 열어 확인해 주세요."));
        });
        emitter.onCompletion(stream::markClosed);
        emitter.onError(error -> stream.markClosed());
        try {
            executor.execute(() -> run(memberId, pending, stream));
        } catch (TaskRejectedException e) {
            throw new AiChatBusyException();
        }
        return emitter;
    }

    private void run(Long memberId, PendingQuestion pending, AnswerStream stream) {
        long interval = properties.keepAliveInterval().toMillis();
        ScheduledFuture<?> keepAlive =
                keepAliveScheduler.scheduleAtFixedRate(stream::ping, interval, interval, TimeUnit.MILLISECONDS);
        try {
            AiChatAnswerResponse answer = aiChatService.answer(memberId, pending, stream);
            stream.send(ApiResponse.success(AiChatStreamEvent.Complete.of(answer)));
        } catch (RuntimeException e) {
            log.error("AI 대화 답변 스트림 처리 실패: chatId={}, step={}", pending.chatId(), stream.currentStep, e);
            stream.send(errorResponse(
                    stream.currentStep,
                    HttpStatus.INTERNAL_SERVER_ERROR,
                    "INTERNAL_SERVER_ERROR",
                    "답변을 만들지 못했어요. 잠시 후 다시 만들기를 눌러 주세요."));
        } finally {
            keepAlive.cancel(false);
            stream.complete();
        }
    }

    /** 기존 에러 응답과 같은 형태({@code success=false}, {@code error})에 이벤트 종류와 실패 단계를 {@code data}로 담는다. */
    private static ApiResponse<AiChatStreamEvent.Error> errorResponse(
            AiChatStep step, HttpStatus status, String code, String message) {
        return new ApiResponse<>(false, message, AiChatStreamEvent.Error.of(step), ApiError.of(status, code));
    }

    @Override
    public void destroy() {
        keepAliveScheduler.shutdownNow();
        executor.shutdown();
    }

    /** 요청 하나의 스트림. 답변 스레드와 keepalive 스레드가 함께 보내므로 전송은 동기화한다. */
    private static final class AnswerStream implements AiChatProgress {

        private final SseEmitter emitter;
        private volatile AiChatStep currentStep;
        private boolean closed;

        private AnswerStream(SseEmitter emitter) {
            this.emitter = emitter;
        }

        @Override
        public void started(AiChatStep step) {
            currentStep = step;
            send(ApiResponse.success(
                    step.startMessage(), AiChatStreamEvent.Step.of(step, AiChatStreamEvent.Step.START, null)));
        }

        @Override
        public void done(AiChatStep step, Object result) {
            send(ApiResponse.success(
                    step.doneMessage(), AiChatStreamEvent.Step.of(step, AiChatStreamEvent.Step.DONE, result)));
        }

        @Override
        public void skipped(AiChatStep step) {
            send(ApiResponse.success(
                    "상품과 관련된 질문이 아니라 매물 찾기를 건너뛰었어요.",
                    AiChatStreamEvent.Step.of(step, AiChatStreamEvent.Step.SKIP, null)));
        }

        @Override
        public void delta(String text) {
            send(ApiResponse.success(AiChatStreamEvent.Delta.of(text)));
        }

        @Override
        public boolean streamsText() {
            return true;
        }

        /** 이벤트 하나를 {@code data:} 줄로 보낸다. 전송에 실패하면 연결이 끊긴 것으로 보고 이후 이벤트는 버린다(답변은 계속). */
        synchronized void send(ApiResponse<?> response) {
            if (closed) {
                return;
            }
            try {
                emitter.send(SseEmitter.event().data(response, MediaType.APPLICATION_JSON));
            } catch (IOException | IllegalStateException e) {
                closed = true;
                log.debug("AI 대화 SSE 이벤트 전송 실패(연결 종료): reason={}", e.getMessage());
            }
        }

        synchronized void ping() {
            if (closed) {
                return;
            }
            try {
                emitter.send(SseEmitter.event().comment("ping"));
            } catch (IOException | IllegalStateException e) {
                closed = true;
            }
        }

        synchronized void sendAndClose(ApiResponse<?> response) {
            send(response);
            complete();
        }

        synchronized void markClosed() {
            closed = true;
        }

        synchronized void complete() {
            if (closed) {
                return;
            }
            closed = true;
            try {
                emitter.complete();
            } catch (IllegalStateException e) {
                log.debug("AI 대화 SSE 종료 실패(이미 종료됨): {}", e.getMessage());
            }
        }
    }
}
