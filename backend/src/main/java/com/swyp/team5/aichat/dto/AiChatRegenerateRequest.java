package com.swyp.team5.aichat.dto;

import jakarta.validation.constraints.Size;

/** 답변 다시 만들기. {@code message}를 보내면 바로 앞 질문을 그 내용으로 바꾼 뒤 다시 답한다(질문 수정). */
public record AiChatRegenerateRequest(@Size(max = 500, message = "질문은 500자 이하로 입력해 주세요.") String message) {

    public boolean editsQuestion() {
        return message != null && !message.isBlank();
    }
}
