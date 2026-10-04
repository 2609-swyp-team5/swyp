package com.swyp.team5.productanalysis.service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.OptionalDouble;

import com.swyp.team5.productanalysis.entity.AnalysisRecommendation;
import com.swyp.team5.productanalysis.entity.ForecastPeriod;

/**
 * 판매자 추천에 붙는 1개월 가격 전망. 화면에서 SELL은 "1개월 기다리면 −3%", HOLD는 "1개월 기다리면 +4% 예상"처럼 같은
 * 틀로 보여 준다. 외부 매물(구매자 관점 분석)도 시세 추세로 판매자 규칙을 정해 같은 전망을 쓴다.
 *
 * <ul>
 *   <li>HOLD(시세가 월 {@value RecommendationRule#TREND_THRESHOLD_PERCENT}% 이상 오르는 중): 대기 기간 1개월, 변화율은 관측된 월
 *       추세를 최대 {@value #MAX_RISE_PERCENT}%로 제한한 값(짧은 급등이 과장되지 않게 — 감가 예측의 관측 추세 상한과 같음).
 *       감가 예측은 상승을 반영하지 않아(현재가 상한) 여기서는 쓸 수 없다
 *   <li>SELL: 대기 기간 없음, 변화율은 감가 예측의 월 변화율(0 이하), 예상 가격은 감가 예측 1M 값
 * </ul>
 *
 * <p>예상 가격은 1,000원 단위로 반올림하지만, 변화율은 반올림 전 비율을 쓴다(저가 상품에서 0%로 뭉개지지 않게).
 */
final class PriceOutlookRule {

    static final int MAX_RISE_PERCENT = 5;

    private static final double MAX_RISE_RATE = MAX_RISE_PERCENT / 100.0;
    private static final double MIN_RISE_RATE = RecommendationRule.TREND_THRESHOLD_PERCENT / 100.0;
    private static final long ROUNDING_UNIT = 1_000;

    record Outlook(ForecastPeriod waitPeriod, long expectedPrice, BigDecimal expectedPriceChangeRate) {}

    private PriceOutlookRule() {}

    /**
     * @param sellerRecommendation 판매자 관점 추천(SELL/HOLD)
     * @param monthlyRate 관측된 월 시세 추세({@link PriceTrend#monthlyRate()})
     * @param forecastMonthlyRate 감가 예측에 쓴 월 변화율({@link DepreciationForecaster#monthlyRate})
     * @param averagePrice 이번 분석의 유사 매물 평균가
     * @param oneMonthForecast 감가 예측 1M 예상가
     */
    static Outlook forSeller(
            AnalysisRecommendation sellerRecommendation,
            OptionalDouble monthlyRate,
            double forecastMonthlyRate,
            long averagePrice,
            long oneMonthForecast) {
        if (sellerRecommendation == AnalysisRecommendation.HOLD) {
            double rate = Math.clamp(monthlyRate.orElse(MIN_RISE_RATE), MIN_RISE_RATE, MAX_RISE_RATE);
            long expectedPrice = Math.round(averagePrice * (1 + rate) / ROUNDING_UNIT) * ROUNDING_UNIT;
            return new Outlook(ForecastPeriod.ONE_MONTH, expectedPrice, scale(rate));
        }
        return new Outlook(null, oneMonthForecast, scale(Math.min(forecastMonthlyRate, 0)));
    }

    private static BigDecimal scale(double rate) {
        return BigDecimal.valueOf(rate).setScale(4, RoundingMode.HALF_UP);
    }
}
