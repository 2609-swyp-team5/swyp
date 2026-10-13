package com.swyp.team5.productanalysis.dto;

import com.fasterxml.jackson.annotation.JsonUnwrapped;

/**
 * 분석 결과 구독 스트림(SSE)의 마지막 이벤트 {@code data}. {@code GET /products/{id}/analysis} 응답 필드를 그대로 펼쳐 두고 이벤트
 * 종류({@code event})만 추가한다(상품 등록 스트림의 complete 이벤트와 같은 방식).
 *
 * @param event 이벤트 종류(항상 {@code complete})
 */
public record AnalysisCompleteEvent(String event, @JsonUnwrapped ProductAnalysisResponse analysis) {

    public static final String EVENT = "complete";

    public static AnalysisCompleteEvent of(ProductAnalysisResponse analysis) {
        return new AnalysisCompleteEvent(EVENT, analysis);
    }
}
