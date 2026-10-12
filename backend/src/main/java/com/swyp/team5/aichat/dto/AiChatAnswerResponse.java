package com.swyp.team5.aichat.dto;

/** 질문 전송·다시 만들기 결과 — 저장된 질문과 새 답변. */
public record AiChatAnswerResponse(
        Long chatId, String title, AiChatMessageResponse question, AiChatMessageResponse answer) {}
