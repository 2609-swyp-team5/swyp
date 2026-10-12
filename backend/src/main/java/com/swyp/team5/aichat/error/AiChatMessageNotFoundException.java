package com.swyp.team5.aichat.error;

/** 대화 안에 없는 메시지이거나, 다시 만들기 대상이 답변(ASSISTANT)이 아닌 경우. */
public class AiChatMessageNotFoundException extends RuntimeException {

    public AiChatMessageNotFoundException() {
        super("다시 만들 답변을 찾을 수 없어요.");
    }
}
