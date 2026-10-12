package com.swyp.team5.aichat.error;

/** 최근 대화 목록의 커서를 해석할 수 없는 경우(400). */
public class InvalidAiChatCursorException extends RuntimeException {

    public InvalidAiChatCursorException() {
        super("잘못된 커서예요. 이전 응답의 nextCursor를 그대로 보내 주세요.");
    }
}
