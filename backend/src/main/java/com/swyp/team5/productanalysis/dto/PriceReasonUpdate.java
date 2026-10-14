package com.swyp.team5.productanalysis.dto;

/**
 * 가격 변경 후 AI가 다시 쓴 근거를 저장할 대상과 내용.
 *
 * @param analysisId 근거를 바꿀 시세 분석(AI 요청 시점의 가장 최근 분석)
 * @param price AI에게 준 등록가(저장 전에 가격이 또 바뀌었으면 버린다)
 */
public record PriceReasonUpdate(
        Long productId, Long analysisId, long price, String description, String buyerDescription) {}
