package com.swyp.team5.productanalysis.service;

import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.OptionalDouble;

import com.swyp.team5.productanalysis.entity.ForecastPeriod;

/**
 * 감가 예측가 계산. 월 변화율 {@code r}로 {@code 예상가(t) = 현재 평균가 × (1 + r)^t}(t = 1/3/6개월)를 구한다.
 *
 * <p>{@code r}은 최상위 카테고리별 기본 감가율과 지난 분석 평균가의 관측 추세({@link PriceTrend#monthlyRate()})를 가중
 * 혼합한다. 관측 기간이 짧을수록 기본값 비중이 크고, {@value #FULL_TRUST_DAYS}일 이상 관측되면 관측 추세만 쓴다. 관측 추세는
 * 짧은 기간의 급등락이 6개월로 과장되지 않게 범위를 제한하고, 예상가는 현재 평균가를 넘지 않는다(감가 예측이라 상승은
 * 반영하지 않음). 1,000원 단위로 반올림한다.
 */
final class DepreciationForecaster {

    /** 관측 추세만으로 예측할 만큼 충분하다고 보는 관측 기간(일). 관측 추세는 최근 6개월 기록으로 계산한다. */
    static final int FULL_TRUST_DAYS = 30;

    /** 최상위 카테고리를 알 수 없거나 표에 없을 때의 월 감가율. */
    static final double DEFAULT_MONTHLY_RATE = -0.02;

    private static final double MIN_OBSERVED_RATE = -0.15;
    private static final double MAX_OBSERVED_RATE = 0.05;
    private static final long ROUNDING_UNIT = 1_000;

    /** 최상위 카테고리(번개장터 대분류)별 기본 월 감가율. 경험적 가정값이라 데이터가 쌓이면 조정한다. */
    private static final Map<String, Double> BASE_MONTHLY_RATES = Map.ofEntries(
            Map.entry("디지털", -0.03),
            Map.entry("가전제품", -0.02),
            Map.entry("여성의류", -0.03),
            Map.entry("남성의류", -0.03),
            Map.entry("신발", -0.025),
            Map.entry("가방/지갑", -0.015),
            Map.entry("시계", -0.01),
            Map.entry("쥬얼리", -0.005),
            Map.entry("패션 액세서리", -0.02),
            Map.entry("트레이딩 카드", 0.0),
            Map.entry("스포츠/레저", -0.02),
            Map.entry("차량/오토바이", -0.015),
            Map.entry("스타굿즈", -0.01),
            Map.entry("키덜트", -0.005),
            Map.entry("예술/희귀/수집품", 0.0),
            Map.entry("음반/악기", -0.01),
            Map.entry("도서/티켓/문구", -0.02),
            Map.entry("뷰티/미용", -0.03),
            Map.entry("가구/인테리어", -0.02),
            Map.entry("생활/주방용품", -0.02),
            Map.entry("공구/산업용품", -0.015),
            Map.entry("식품", -0.03),
            Map.entry("유아동/출산", -0.025),
            Map.entry("반려동물용품", -0.02));

    record Forecast(ForecastPeriod period, long expectedPrice) {}

    private DepreciationForecaster() {}

    /**
     * @param averagePrice 이번 분석의 유사 매물 평균가
     * @param trend 이번 분석까지 포함한 평균가 추이
     * @param rootCategoryName 상품의 최상위 카테고리 이름(모르면 null)
     */
    static List<Forecast> forecast(long averagePrice, PriceTrend trend, String rootCategoryName) {
        double rate = monthlyRate(trend, rootCategoryName);
        return Arrays.stream(ForecastPeriod.values())
                .map(period -> new Forecast(period, expectedPrice(averagePrice, rate, period.getMonths())))
                .toList();
    }

    /** 기본 감가율과 관측 추세를 관측 기간 비율로 가중 혼합한 월 변화율. */
    static double monthlyRate(PriceTrend trend, String rootCategoryName) {
        double baseRate = baseMonthlyRate(rootCategoryName);
        OptionalDouble observed = trend.monthlyRate();
        if (observed.isEmpty()) {
            return baseRate;
        }
        double observedRate = Math.clamp(observed.getAsDouble(), MIN_OBSERVED_RATE, MAX_OBSERVED_RATE);
        double weight = Math.min((double) trend.observedDays() / FULL_TRUST_DAYS, 1.0);
        return weight * observedRate + (1 - weight) * baseRate;
    }

    static double baseMonthlyRate(String rootCategoryName) {
        return rootCategoryName == null
                ? DEFAULT_MONTHLY_RATE
                : BASE_MONTHLY_RATES.getOrDefault(rootCategoryName, DEFAULT_MONTHLY_RATE);
    }

    private static long expectedPrice(long averagePrice, double monthlyRate, int months) {
        double raw = Math.min(averagePrice * Math.pow(1 + monthlyRate, months), averagePrice);
        return Math.max(0, Math.round(raw / ROUNDING_UNIT) * ROUNDING_UNIT);
    }
}
