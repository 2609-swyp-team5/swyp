package com.swyp.team5.aichat.error;

/** 존재하지 않거나 본인 대화가 아닌 경우(다른 회원 대화의 존재 여부를 드러내지 않도록 같은 404로 처리). */
public class AiChatNotFoundException extends RuntimeException {

    public AiChatNotFoundException() {
        super("존재하지 않는 대화예요.");
    }
}
