package com.swyp.team5.aichat.service;

import com.swyp.team5.aichat.dto.AiChatStep;

/** 답변 만들기 진행 상황을 받는 쪽(답변 스트림). JSON 응답처럼 진행 상황이 필요 없으면 {@link #NONE}. */
public interface AiChatProgress {

    AiChatProgress NONE = new AiChatProgress() {};

    /** 단계를 시작했다. */
    default void started(AiChatStep step) {}

    /**
     * 단계를 마쳤다.
     *
     * @param result 단계 결과(매물·시세 찾기만, 그 외 null)
     */
    default void done(AiChatStep step, Object result) {}

    /** 단계를 건너뛰었다(상품과 무관한 질문). */
    default void skipped(AiChatStep step) {}

    /** 답변 문장 조각을 받았다. */
    default void delta(String text) {}

    /** 답변 문장 조각을 받는지(아니면 문장을 한 번에 만든다). */
    default boolean streamsText() {
        return false;
    }
}
