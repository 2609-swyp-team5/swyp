package com.swyp.team5.aichat.error;

/** 답변 스트림 처리 대기열이 가득 찬 경우(503). */
public class AiChatBusyException extends RuntimeException {

    public AiChatBusyException() {
        super("AI 대화 요청이 많아 지금은 답할 수 없어요. 잠시 후 다시 시도해 주세요.");
    }
}
