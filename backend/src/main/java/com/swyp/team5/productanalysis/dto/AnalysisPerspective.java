package com.swyp.team5.productanalysis.dto;

/** 시세 분석 조회 관점. 판매자(SELL)는 판매 추천(SELL/HOLD), 구매자(BUY)는 구매 추천(BUY/WAIT)을 본다. */
public enum AnalysisPerspective {
    SELL,
    BUY
}
