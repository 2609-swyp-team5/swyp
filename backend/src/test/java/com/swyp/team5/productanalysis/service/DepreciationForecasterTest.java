package com.swyp.team5.productanalysis.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.within;

import java.time.LocalDate;
import java.util.List;

import com.swyp.team5.productanalysis.entity.ForecastPeriod;
import com.swyp.team5.productanalysis.service.DepreciationForecaster.Forecast;
import org.junit.jupiter.api.Test;

// 감가 예측 계산 단위 테스트.
class DepreciationForecasterTest {

    private static final LocalDate START = LocalDate.of(2026, 9, 1);

    /** {@code days}일 동안 매일 {@code dailyFactor}배씩 변한 평균가 추이. */
    private static PriceTrend trend(long startPrice, double dailyFactor, int days) {
        return PriceTrend.of(java.util.stream.IntStream.rangeClosed(0, days)
                .mapToObj(day -> new PriceTrend.Snapshot(
                        START.plusDays(day).atStartOfDay(), Math.round(startPrice * Math.pow(dailyFactor, day))))
                .toList());
    }

    // 추세 기록이 없으면 카테고리 기본 감가율, (1+r)^t를 1,000원 단위로 반올림
    @Test
    void usesCategoryBaseRateWithoutTrend() {
        List<Forecast> forecasts = DepreciationForecaster.forecast(1_000_000L, PriceTrend.of(List.of()), "디지털");

        // 디지털 -3%/월: 970,000 / 912,673 / 832,972
        assertThat(forecasts)
                .containsExactly(
                        new Forecast(ForecastPeriod.ONE_MONTH, 970_000L),
                        new Forecast(ForecastPeriod.THREE_MONTHS, 913_000L),
                        new Forecast(ForecastPeriod.SIX_MONTHS, 833_000L));
    }

    // 표에 없거나 모르는 카테고리는 기본값 -2%/월
    @Test
    void fallsBackToDefaultRateForUnknownCategory() {
        assertThat(DepreciationForecaster.baseMonthlyRate("기타")).isEqualTo(DepreciationForecaster.DEFAULT_MONTHLY_RATE);
        assertThat(DepreciationForecaster.baseMonthlyRate(null)).isEqualTo(DepreciationForecaster.DEFAULT_MONTHLY_RATE);
    }

    // 관측 기간이 30일 이상이면 관측 추세만 사용
    @Test
    void usesObservedTrendOnlyWhenObservedLongEnough() {
        double dailyFactor = Math.pow(0.95, 1 / 30.0); // 월 -5%
        double rate = DepreciationForecaster.monthlyRate(trend(1_000_000L, dailyFactor, 30), "디지털");

        assertThat(rate).isCloseTo(-0.05, within(0.001));
    }

    // 관측 기간이 짧으면 기본 감가율과 가중 혼합(15일 = 관측 50% + 기본 50%)
    @Test
    void blendsObservedTrendWithBaseRateByObservedDays() {
        double dailyFactor = Math.pow(0.95, 1 / 30.0); // 월 -5%
        double rate = DepreciationForecaster.monthlyRate(trend(1_000_000L, dailyFactor, 15), "디지털");

        assertThat(rate).isCloseTo(0.5 * -0.05 + 0.5 * -0.03, within(0.001));
    }

    // 관측 추세가 극단적이면 월 -15%로 제한
    @Test
    void clampsExtremeObservedDecline() {
        double dailyFactor = Math.pow(0.5, 1 / 30.0); // 월 -50%
        double rate = DepreciationForecaster.monthlyRate(trend(1_000_000L, dailyFactor, 30), "디지털");

        assertThat(rate).isCloseTo(-0.15, within(0.0001));
    }

    // 시세가 오르는 추세여도 예상가는 현재 평균가를 넘지 않음
    @Test
    void neverForecastsAboveCurrentAverage() {
        double dailyFactor = Math.pow(1.04, 1 / 30.0); // 월 +4%
        List<Forecast> forecasts =
                DepreciationForecaster.forecast(500_000L, trend(400_000L, dailyFactor, 30), "트레이딩 카드");

        assertThat(forecasts)
                .allSatisfy(forecast -> assertThat(forecast.expectedPrice()).isEqualTo(500_000L));
    }
}
