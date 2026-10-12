package com.swyp.team5.aichat.dto;

import com.swyp.team5.aichat.entity.AiChatIntent;

/** 지금이니 AI 추천 질문 — 칩을 누르면 {@code question}을 그대로 질문으로 보낸다. */
public record AiChatSuggestionResponse(
        String question, // 화면에 보여 주고 그대로 보낼 질문(예: "아이폰 지금 얼마야?")
        AiChatIntent intent, // 질문 의도(SELL 팔기/BUY 사기/PRICE 시세)
        String keyword, // 질문에 넣은 상품 이름(짧게 줄인 값)
        Source source) { // 질문을 만든 재료

    public enum Source {
        MY_PRODUCT, // 내 판매 상품(판매중·예약중)
        INTEREST, // 내 관심상품(판매중)
        TRENDING, // 최근 7일 인기 검색어
        DEFAULT // 재료가 없을 때 기본 질문
    }
}
