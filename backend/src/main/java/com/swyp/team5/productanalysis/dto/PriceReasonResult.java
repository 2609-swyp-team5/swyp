package com.swyp.team5.productanalysis.dto;

import com.fasterxml.jackson.annotation.JsonPropertyDescription;

/**
 * 상품 가격이 바뀐 뒤 AI(Gemini, 실패 시 OpenAI GPT)에게 시세 분석 근거 문장만 다시 써 달라고 했을 때 받는 응답. 추천(판매자 SELL/HOLD,
 * 구매자 BUY/WAIT)은 규칙으로 이미 정해 두고 문장만 받는다.
 */
public record PriceReasonResult(
        @JsonPropertyDescription("판매자 관점 추천의 근거를 1~2문장으로 설명(새 등록가 기준)") String description,
        @JsonPropertyDescription("구매자 관점 추천의 근거를 1~2문장으로 설명(새 등록가 기준)") String buyerDescription) {}
