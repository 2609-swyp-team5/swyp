package com.swyp.team5.aichat.entity;

/** 질문 의도 — 답변에서 어떤 관점(판매자/구매자)의 시세 분석을 보여줄지 정한다. */
public enum AiChatIntent {
    SELL, // 팔기(판매 타이밍·판매가) — 내 판매 상품을 먼저 찾고 판매자 관점 분석
    BUY, // 사기(구매 타이밍·싸게 사기) — 시장 매물을 구매자 관점으로 분석
    PRICE, // 시세만 궁금함 — 시장 매물을 구매자 관점으로 분석
    UNKNOWN // 상품과 무관한 질문 등 판단 불가 — 시세 카드 없이 답변
}
