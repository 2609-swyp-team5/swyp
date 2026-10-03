package com.swyp.team5.productanalysis.dto;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.List;

import com.swyp.team5.item.entity.Item;
import com.swyp.team5.productanalysis.entity.AnalysisConfidence;
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
        AnalysisRecommendation recommendation, // 우리 상품은 판매자 관점(SELL/HOLD), 외부 매물은 구매자 관점(BUY/WAIT)
        Long suggestedPrice,
        String description, // recommendation의 근거
        AnalysisRecommendation buyerRecommendation, // 우리 상품을 관심 등록한 구매자 관점(BUY/WAIT), 외부 매물·관점 분리 이전 분석은 null
        String buyerDescription, // buyerRecommendation의 근거
        LocalDateTime analyzedAt,
        AnalysisConfidence confidence, // 신뢰도 등급(HIGH/MEDIUM/LOW) — 매물 수 비율·가격 변동 중 낮은 쪽, 분석 24시간 경과 시 한 단계 하향
        Integer confidenceRate, // 신뢰도 비율(0~100, 매물 수 기반 — 비교 매물 20건 이상이면 100)
        Integer listingCount, // 통계에 쓴 비교 매물 수(위 세 필드는 신뢰도 도입 이전 분석이면 null)
        String waitPeriod, // 판매자 추천이 HOLD일 때 권장 대기 기간(1M), SELL·외부 매물이면 null
        Long expectedPrice, // 1개월 뒤 예상 가격(HOLD=시세 추세 기반 상승, SELL=감가 예측 1M), 외부 매물이면 null
        BigDecimal expectedPriceChangeRate, // 1개월 예상 변화율(소수 4자리 비율, 0.04 = +4%), 외부 매물이면 null
        List<PriceForecastResponse>
                forecasts) { // 감가 예측가(1M/3M/6M 순), 분석 이력이 없거나 예측 도입 전 분석이면 빈 배열 — GET /analysis/forecast로 분리됨, 프론트 전환 후
    // 제거 예정

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

    /**
     * @param confidence 조회 시점 신뢰도 등급(오래된 분석이면 저장값보다 한 단계 낮음)
     * @param confidenceRate 매물 수 기반 신뢰도 비율
     */
    public static ProductAnalysisResponse from(
            Item product,
            ProductAnalysis analysis,
            AnalysisConfidence confidence,
            Integer confidenceRate,
            List<PriceForecast> forecasts) {
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
                analysis.getBuyerRecommendation(),
                analysis.getBuyerDescription(),
                analysis.getAnalyzedAt(),
                confidence,
                confidenceRate,
                analysis.getListingCount(),
                analysis.getWaitPeriod() == null
                        ? null
                        : analysis.getWaitPeriod().getCode(),
                analysis.getExpectedPrice(),
                analysis.getExpectedPriceChangeRate(),
                PriceForecastResponse.sorted(forecasts));
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
