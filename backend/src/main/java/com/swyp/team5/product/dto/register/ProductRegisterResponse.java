package com.swyp.team5.product.dto.register;

import com.fasterxml.jackson.annotation.JsonUnwrapped;
import com.swyp.team5.product.dto.ProductResponse;
import com.swyp.team5.productanalysis.dto.ProductAnalysisResponse;

/**
 * 단계별 스트리밍 등록·수정(SSE)의 최종 성공 이벤트 {@code data}. 상품 상세 응답의 상품 필드({@link ProductResponse})를 그대로
 * 펼쳐 두고, 이벤트 종류({@code event})와 등록 시점의 가격·분석 정보 모음({@code analysis}), 시세 분석 결과({@code marketAnalysis})를
 * 추가한다.
 *
 * @param event 이벤트 종류(항상 {@code complete})
 * @param product 등록·수정된 상품(JSON에서는 필드가 펼쳐져 상품 상세 응답의 {@code data}와 같은 모양)
 * @param analysis 제안가·판단 근거·비교 매물 평균가·시세 분석 판단·AI 추론값 모음
 * @param marketAnalysis 시세 분석 결과({@code GET /products/{id}/analysis}와 같은 필드, 판매자 관점) — 등록 요청에
 *     {@code withMarketAnalysis=true}일 때만, 그 밖(수정 포함)에는 null
 */
public record ProductRegisterResponse(
        String event,
        @JsonUnwrapped ProductResponse product,
        ProductRegisterAnalysis analysis,
        ProductAnalysisResponse marketAnalysis) {

    public static final String EVENT = "complete";

    public static ProductRegisterResponse of(
            ProductResponse product, ProductRegisterAnalysis analysis, ProductAnalysisResponse marketAnalysis) {
        return new ProductRegisterResponse(EVENT, product, analysis, marketAnalysis);
    }
}
