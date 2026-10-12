package com.swyp.team5.aichat.dto;

import java.util.List;

/** 대화 열기 — 질문·답변을 오래된 순으로. */
public record AiChatDetailResponse(Long chatId, String title, List<AiChatMessageResponse> messages) {}
