package com.swyp.team5.aichat.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** 질문 전송(새 대화·이어서 질문). */
public record AiChatQuestionRequest(
        @NotBlank(message = "질문을 입력해 주세요.") @Size(max = 500, message = "질문은 500자 이하로 입력해 주세요.") String message) {}
