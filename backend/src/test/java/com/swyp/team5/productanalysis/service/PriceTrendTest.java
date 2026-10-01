package com.swyp.team5.productanalysis.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.within;

import java.time.LocalDateTime;
import java.time.YearMonth;
import java.util.List;

import org.junit.jupiter.api.Test;

// 시세 추이 계산 단위 테스트.
class PriceTrendTest {

    private static final LocalDateTime BASE = LocalDateTime.of(2026, 9, 1, 0, 0);

    private static PriceTrend.Snapshot at(int day, int hour, long price) {
        return new PriceTrend.Snapshot(BASE.plusDays(day).plusHours(hour), price);
    }

    // 같은 날 여러 스냅샷은 하루 평균 1개 점으로 합침
    @Test
    void ofMergesSameDaySnapshotsIntoDailyAverage() {
        PriceTrend trend = PriceTrend.of(List.of(at(0, 0, 1000), at(0, 6, 2000), at(1, 0, 3000)));

        assertThat(trend.dailyAverages())
                .extracting(PriceTrend.DailyPrice::averagePrice)
                .containsExactly(1500L, 3000L);
    }

    // 월 변화율 - 매일 같은 비율로 내려가면 그 비율의 30일치
    @Test
    void monthlyRateFollowsLogLinearSlope() {
        double dailyFactor = Math.pow(0.9, 1.0 / 30); // 한 달에 10% 하락
        List<PriceTrend.Snapshot> history = java.util.stream.IntStream.rangeClosed(0, 14)
                .mapToObj(day -> at(day, 0, Math.round(1_000_000 * Math.pow(dailyFactor, day))))
                .toList();

        assertThat(PriceTrend.of(history).monthlyRate().getAsDouble()).isCloseTo(-0.10, within(0.001));
    }

    // 월 변화율 - 관측 기간이 7일 미만이면 계산하지 않음
    @Test
    void monthlyRateIsEmptyWhenObservedPeriodTooShort() {
        PriceTrend trend = PriceTrend.of(List.of(at(0, 0, 1000), at(6, 0, 500)));

        assertThat(trend.monthlyRate()).isEmpty();
    }

    // 월별 평균 - 일별 평균의 평균(분석이 몰린 날도 하루 1개로 셈)과 기록 일수
    @Test
    void monthlyAveragesAverageDailyPointsPerMonth() {
        PriceTrend trend = PriceTrend.of(List.of(
                at(0, 0, 1000), at(0, 6, 1000), at(0, 12, 1000), at(1, 0, 2000), at(30, 0, 3000))); // 9/1·9/2·10/1

        assertThat(trend.monthlyAverages())
                .containsExactly(
                        new PriceTrend.MonthlyPrice(YearMonth.of(2026, 9), 1500L, 2),
                        new PriceTrend.MonthlyPrice(YearMonth.of(2026, 10), 3000L, 1));
    }

    // n개월 전 대비 변화율 - 그 날짜 이전 가장 가까운 점과 비교, 기록이 없으면 빈 값
    @Test
    void changeSinceMonthsComparesWithClosestEarlierPoint() {
        PriceTrend trend = PriceTrend.of(List.of(at(0, 0, 1000), at(3, 0, 1200), at(40, 0, 900))); // 9/1·9/4·10/11

        assertThat(trend.changeSinceMonths(1).getAsDouble()).isCloseTo(-0.25, within(1e-9)); // 9/4 1200 → 900
        assertThat(trend.changeSinceMonths(3)).isEmpty();
    }

    // 이번 분석 결과를 더하면 마지막 점이 됨
    @Test
    void plusAppendsCurrentAnalysis() {
        PriceTrend trend = PriceTrend.of(List.of(at(0, 0, 1000))).plus(BASE.plusDays(8), 800);

        assertThat(trend.dailyAverages().getLast().averagePrice()).isEqualTo(800L);
        assertThat(trend.observedDays()).isEqualTo(8);
    }

    // 프롬프트 - 기록이 없으면 추세를 지어내지 않도록 첫 분석이라고 알림
    @Test
    void toPromptTextSaysNoHistoryWhenEmpty() {
        assertThat(PriceTrend.of(List.of()).toPromptText()).contains("이전 분석 기록 없음");
    }

    // 프롬프트 - 월별 평균가와 1/3/6개월 전 대비 변화율 포함(기록 없는 기간은 "기록 없음")
    @Test
    void toPromptTextListsMonthlyPricesAndChanges() {
        String text = PriceTrend.of(List.of(at(0, 0, 1000), at(35, 0, 900))).toPromptText(); // 9/1·10/6

        assertThat(text)
                .contains(
                        "2026-09: 1,000원(기록 1일)",
                        "2026-10: 900원(기록 1일)",
                        "1개월 전 대비: -10.0%",
                        "3개월 전 대비: 기록 없음",
                        "6개월 전 대비: 기록 없음",
                        "월 변화율");
    }
}
