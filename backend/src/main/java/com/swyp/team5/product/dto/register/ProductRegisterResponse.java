package com.swyp.team5.product.dto.register;

import com.fasterxml.jackson.annotation.JsonUnwrapped;
import com.swyp.team5.product.dto.ProductResponse;

/**
 * 단계별 스트리밍 등록(v2)의 최종 성공 이벤트 {@code data}. 기존 등록 응답의 상품 필드({@link ProductResponse})를 그대로
 * 펼쳐 두고, 이벤트 종류({@code event})와 등록 시점의 가격·분석 정보 모음({@code analysis})만 추가한다.
 *
 * @param event 이벤트 종류(항상 {@code complete})
 * @param product 등록된 상품(JSON에서는 필드가 펼쳐져 기존 등록 응답의 {@code data}와 같은 모양)
 * @param analysis 제안가·판단 근거·비교 매물 평균가·시세 분석 판단·AI 추론값 모음
 */
public record ProductRegisterResponse(
        String event, @JsonUnwrapped ProductResponse product, ProductRegisterAnalysis analysis) {

    public static final String EVENT = "complete";

    public static ProductRegisterResponse of(ProductResponse product, ProductRegisterAnalysis analysis) {
        return new ProductRegisterResponse(EVENT, product, analysis);
    }
}
