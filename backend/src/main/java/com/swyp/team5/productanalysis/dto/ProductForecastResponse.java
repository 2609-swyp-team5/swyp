package com.swyp.team5.productanalysis.dto;

import java.time.LocalDateTime;
import java.util.List;

import com.swyp.team5.item.entity.Item;
import com.swyp.team5.productanalysis.entity.PriceForecast;
import com.swyp.team5.productanalysis.entity.ProductAnalysis;

/**
 * 상품(또는 관심 등록된 외부 매물)의 감가 예측. 가장 최근 시세 분석 때 함께 계산한 기간별 예상 가격이다.
 *
 * @param currentPrice 상품의 현재 등록가(판매 희망가, 외부 매물은 판매가) — 분석 이력이 없어도 채워짐
 * @param analysisId 예측을 계산한 시세 분석 ID, 분석 이력이 없으면 null
 * @param analyzedAt 예측을 계산한 시각, 분석 이력이 없으면 null
 * @param forecasts 기간별 예상 가격(1M/3M/6M 순), 분석 이력이 없거나 예측 도입 전 분석이면 빈 배열
 */
public record ProductForecastResponse(
        Long productId,
        Long currentPrice,
        Long analysisId,
        LocalDateTime analyzedAt,
        List<PriceForecastResponse> forecasts) {

    /** 아직 분석 이력이 없는 상품에 사용한다. */
    public static ProductForecastResponse empty(Item product) {
        return new ProductForecastResponse(product.getId(), product.getPrice(), null, null, List.of());
    }

    public static ProductForecastResponse from(Item product, ProductAnalysis analysis, List<PriceForecast> forecasts) {
        return new ProductForecastResponse(
                product.getId(),
                product.getPrice(),
                analysis.getId(),
                analysis.getAnalyzedAt(),
                PriceForecastResponse.sorted(forecasts));
    }
}
