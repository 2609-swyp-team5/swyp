package com.swyp.team5.productanalysis.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.within;

import java.time.LocalDateTime;
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

    // n일 전 대비 변화율 - 그 날짜 이전 가장 가까운 점과 비교, 기록이 없으면 빈 값
    @Test
    void changeSinceComparesWithClosestEarlierPoint() {
        PriceTrend trend = PriceTrend.of(List.of(at(0, 0, 1000), at(3, 0, 1200), at(10, 0, 900)));

        assertThat(trend.changeSince(7).getAsDouble()).isCloseTo(-0.25, within(1e-9)); // 3일차 1200 → 900
        assertThat(trend.changeSince(30)).isEmpty();
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

    // 프롬프트 - 일별 평균가와 변화율 포함
    @Test
    void toPromptTextListsDailyPricesAndChanges() {
        String text = PriceTrend.of(List.of(at(0, 0, 1000), at(8, 0, 900))).toPromptText();

        assertThat(text).contains("2026-09-01: 1,000원", "2026-09-09: 900원", "7일 전 대비: -10.0%", "월 변화율");
    }
}
