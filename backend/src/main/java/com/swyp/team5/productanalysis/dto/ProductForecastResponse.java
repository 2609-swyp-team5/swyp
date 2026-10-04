package com.swyp.team5.productanalysis.dto;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Comparator;
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
 * @param valuationForecast 기준 가치 대비 기간별 예상 가치
 */
public record ProductForecastResponse(
        Long productId,
        Long currentPrice,
        Long analysisId,
        LocalDateTime analyzedAt,
        ValuationForecast valuationForecast) {

    /** 기준 가치 비율(%). 예상 가치 비율은 이 값을 100으로 둔 비율이다. */
    private static final BigDecimal BASE_VALUE_RATE = BigDecimal.valueOf(100);

    /**
     * @param baseDate 기준일 — 분석일(분석 이력이 없으면 오늘)
     * @param baseValue 기준 가치 — 분석 평균 시세(감가 예측의 출발점, 분석 이력이 없으면 현재 등록가)
     * @param baseValueRate 기준 가치 비율(항상 100)
     * @param forecasts 기간별 예상 가치(1M/3M/6M 순), 분석 이력이 없거나 예측 도입 전 분석이면 빈 배열
     */
    public record ValuationForecast(
            LocalDate baseDate, long baseValue, BigDecimal baseValueRate, List<Forecast> forecasts) {}

    /**
     * @param period 예측 기간({@code 1M}/{@code 3M}/{@code 6M})
     * @param expectedValue 예상 가격(원)
     * @param expectedValueRate 기준 가치 대비 예상 가치 비율(%, 소수 둘째 자리 — 예: 97.08)
     * @param expectedChangeRate 기준 가치 대비 변화율(%, 소수 둘째 자리 — 예: -2.92)
     */
    public record Forecast(
            String period, long expectedValue, BigDecimal expectedValueRate, BigDecimal expectedChangeRate) {

        static Forecast of(PriceForecast forecast, long baseValue) {
            BigDecimal valueRate = baseValue == 0
                    ? BASE_VALUE_RATE
                    : BigDecimal.valueOf(forecast.getExpectedPrice())
                            .multiply(BASE_VALUE_RATE)
                            .divide(BigDecimal.valueOf(baseValue), 2, RoundingMode.HALF_UP);
            return new Forecast(
                    forecast.getPeriod().getCode(),
                    forecast.getExpectedPrice(),
                    valueRate,
                    valueRate.subtract(BASE_VALUE_RATE));
        }
    }

    /** 아직 분석 이력이 없는 상품에 사용한다. */
    public static ProductForecastResponse empty(Item product, LocalDate today) {
        return new ProductForecastResponse(
                product.getId(),
                product.getPrice(),
                null,
                null,
                new ValuationForecast(today, product.getPrice(), BASE_VALUE_RATE, List.of()));
    }

    public static ProductForecastResponse from(Item product, ProductAnalysis analysis, List<PriceForecast> forecasts) {
        long baseValue = analysis.getAveragePrice();
        return new ProductForecastResponse(
                product.getId(),
                product.getPrice(),
                analysis.getId(),
                analysis.getAnalyzedAt(),
                new ValuationForecast(
                        analysis.getAnalyzedAt().toLocalDate(),
                        baseValue,
                        BASE_VALUE_RATE,
                        forecasts.stream()
                                .sorted(Comparator.comparing(PriceForecast::getPeriod))
                                .map(forecast -> Forecast.of(forecast, baseValue))
                                .toList()));
    }
}
