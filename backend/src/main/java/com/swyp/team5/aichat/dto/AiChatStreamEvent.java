package com.swyp.team5.aichat.dto;

import java.util.List;

import com.fasterxml.jackson.annotation.JsonUnwrapped;
import com.swyp.team5.aichat.entity.AiChatIntent;
import com.swyp.team5.aichat.entity.AiChatPayload;

/**
 * AI 대화 답변 스트림(SSE)의 이벤트 {@code data}. 상품 등록 스트림과 같이 기존 API 응답과 같은 {@code ApiResponse} 형태로 보내고,
 * 이벤트 종류는 {@code data.event}(step/delta/complete/error)로 구분한다. 진행 문구는 {@code ApiResponse.message}에 담는다.
 */
public final class AiChatStreamEvent {

    private AiChatStreamEvent() {}

    /**
     * 진행 단계 이벤트.
     *
     * @param event 항상 {@code step}
     * @param status {@code START} / {@code DONE} / {@code SKIP}(상품과 무관한 질문이라 매물 찾기를 건너뜀)
     * @param index 단계 순서(1부터)
     * @param total 전체 단계 수(단계가 추가되면 늘어나므로 클라이언트는 고정값을 쓰지 말 것)
     * @param result 단계 결과(매물·시세 찾기 완료만 {@link SearchResult}, 그 외 null)
     */
    public record Step(String event, AiChatStep step, String status, int index, int total, Object result) {

        public static final String EVENT = "step";
        public static final String START = "START";
        public static final String DONE = "DONE";
        public static final String SKIP = "SKIP";

        public static Step of(AiChatStep step, String status, Object result) {
            return new Step(EVENT, step, status, step.ordinal() + 1, AiChatStep.values().length, result);
        }
    }

    /**
     * 매물·시세 찾기 결과 — 답변 문장보다 먼저 카드를 그릴 수 있게 보낸다(값은 {@code complete}의 답변과 같다).
     *
     * @param intent 질문 의도
     * @param analysis "상세 시세 분석 보기" 카드(대상 상품을 못 찾았으면 null)
     * @param recommendedProducts 추천 상품
     */
    public record SearchResult(
            AiChatIntent intent,
            AiChatPayload.AnalysisCard analysis,
            List<AiChatPayload.RecommendedProduct> recommendedProducts) {}

    /**
     * 답변 문장 조각(AI가 쓰는 대로). 이어 붙여 보여 주고, 최종 문장은 {@code complete}의 {@code answer.content}로 바꾼다(AI가 중간에
     * 실패하면 고정 문장으로 대체되어 조각과 다를 수 있음).
     *
     * @param event 항상 {@code delta}
     */
    public record Delta(String event, String text) {

        public static final String EVENT = "delta";

        public static Delta of(String text) {
            return new Delta(EVENT, text);
        }
    }

    /**
     * 마지막 이벤트 — JSON 응답({@link AiChatAnswerResponse})과 같은 필드에 {@code event}만 더한다.
     *
     * @param event 항상 {@code complete}
     */
    public record Complete(String event, @JsonUnwrapped AiChatAnswerResponse answer) {

        public static final String EVENT = "complete";

        public static Complete of(AiChatAnswerResponse answer) {
            return new Complete(EVENT, answer);
        }
    }

    /**
     * 실패 이벤트({@code success=false}, {@code error}와 함께). 질문은 이미 저장돼 있어 다시 만들기·이어서 질문으로 이어 갈 수 있다.
     *
     * @param event 항상 {@code error}
     * @param step 실패한 단계(시작 전이면 null)
     */
    public record Error(String event, AiChatStep step) {

        public static final String EVENT = "error";

        public static Error of(AiChatStep step) {
            return new Error(EVENT, step);
        }
    }
}
