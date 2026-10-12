package com.swyp.team5.aichat.dto;

/** 최근 대화 목록 전체 삭제 결과. */
public record AiChatDeleteAllResponse(int deletedCount) {} // 지운 대화 수(없었으면 0)
