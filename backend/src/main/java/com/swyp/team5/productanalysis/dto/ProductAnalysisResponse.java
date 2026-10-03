package com.swyp.team5.productanalysis.dto;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.List;

import com.swyp.team5.item.entity.Item;
import com.swyp.team5.productanalysis.entity.AnalysisRecommendation;
import com.swyp.team5.productanalysis.entity.PriceForecast;
import com.swyp.team5.productanalysis.entity.ProductAnalysis;

public record ProductAnalysisResponse(
        Long productId,
        Long currentPrice, // 상품의 현재 등록가(판매 희망가, 외부 매물은 판매가) — 분석 이력이 없어도 채워짐
        Long analysisId, // 분석 이력이 없으면 null(아래 필드도 전부 null)
        Long minPrice,
        Long averagePrice,
        Long maxPrice,
        BigDecimal marketPriceDiffRate, // 등록가가 평균가보다 몇 % 높은지(음수면 저렴, 소수 첫째 자리 반올림)
        BigDecimal changeRate, // 직전 분석 대비 평균가 변동률, 직전 분석이 없으면 null
        AnalysisRecommendation recommendation,
        Long suggestedPrice,
        String description,
        LocalDateTime analyzedAt,
        List<PriceForecastResponse> forecasts) { // 감가 예측가(1M/3M/6M 순), 분석 이력이 없거나 예측 도입 전 분석이면 빈 배열

    /** 아직 분석 이력이 없는 상품(분석 배치가 아직 돌지 않았거나, 비교 매물이 부족해 건너뛴 경우)에 사용한다. */
    public static ProductAnalysisResponse empty(Item product) {
        return new ProductAnalysisResponse(
                product.getId(),
                product.getPrice(),
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                List.of());
    }

    public static ProductAnalysisResponse from(Item product, ProductAnalysis analysis, List<PriceForecast> forecasts) {
        return new ProductAnalysisResponse(
                product.getId(),
                product.getPrice(),
                analysis.getId(),
                analysis.getMinPrice(),
                analysis.getAveragePrice(),
                analysis.getMaxPrice(),
                diffRate(product.getPrice(), analysis.getAveragePrice()),
                analysis.getChangeRate(),
                analysis.getRecommendation(),
                analysis.getSuggestedPrice(),
                analysis.getDescription(),
                analysis.getAnalyzedAt(),
                forecasts.stream()
                        .sorted(Comparator.comparing(PriceForecast::getPeriod))
                        .map(PriceForecastResponse::from)
                        .toList());
    }

    /** (등록가 − 평균가) / 평균가 × 100을 소수 첫째 자리로 반올림한다. 평균가가 0이면 null. */
    private static BigDecimal diffRate(Long price, Long averagePrice) {
        if (price == null || averagePrice == null || averagePrice == 0) {
            return null;
        }
        return BigDecimal.valueOf(price - averagePrice)
                .multiply(BigDecimal.valueOf(100))
                .divide(BigDecimal.valueOf(averagePrice), 1, RoundingMode.HALF_UP);
    }
}
