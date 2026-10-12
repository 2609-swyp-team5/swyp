package com.swyp.team5.aichat.dto;

import java.time.LocalDateTime;

import com.swyp.team5.aichat.entity.AiChat;

/** 최근 대화 목록의 항목. */
public record AiChatSummaryResponse(
        Long chatId,
        String title, // 첫 질문 앞 30자
        LocalDateTime createdAt,
        LocalDateTime updatedAt) { // 마지막 메시지 시각(목록 정렬 기준)

    public static AiChatSummaryResponse from(AiChat chat) {
        return new AiChatSummaryResponse(chat.getId(), chat.getTitle(), chat.getCreatedAt(), chat.getUpdatedAt());
    }
}
