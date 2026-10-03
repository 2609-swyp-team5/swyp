package com.swyp.team5.productanalysis.service;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;
import java.util.stream.LongStream;

import com.swyp.team5.productanalysis.config.ProductAnalysisProperties;
import com.swyp.team5.productanalysis.entity.AnalysisConfidence;
import org.junit.jupiter.api.Test;

// 시세 분석 신뢰도 규칙 단위 테스트(기본 기준: 20건=100%, HIGH 70%·변동계수 0.2, MEDIUM 40%·0.4, 24시간).
class ConfidenceRuleTest {

    private static final ProductAnalysisProperties.Confidence CRITERIA = ProductAnalysisProperties.Confidence.DEFAULT;

    // 비율 - 매물 수 ÷ 20 × 100, 20건 이상은 100
    @Test
    void rateIsListingCountOverFullListings() {
        assertThat(ConfidenceRule.rate(3, CRITERIA)).isEqualTo(15);
        assertThat(ConfidenceRule.rate(10, CRITERIA)).isEqualTo(50);
        assertThat(ConfidenceRule.rate(14, CRITERIA)).isEqualTo(70);
        assertThat(ConfidenceRule.rate(25, CRITERIA)).isEqualTo(100);
    }

    // 등급 - 가격 변동이 없으면 비율 구간대로(14건 HIGH, 8건 MEDIUM, 7건 LOW)
    @Test
    void gradeFollowsRateWhenPricesAreStable() {
        assertThat(ConfidenceRule.grade(same(14), CRITERIA)).isEqualTo(AnalysisConfidence.HIGH);
        assertThat(ConfidenceRule.grade(same(13), CRITERIA)).isEqualTo(AnalysisConfidence.MEDIUM);
        assertThat(ConfidenceRule.grade(same(8), CRITERIA)).isEqualTo(AnalysisConfidence.MEDIUM);
        assertThat(ConfidenceRule.grade(same(7), CRITERIA)).isEqualTo(AnalysisConfidence.LOW);
    }

    // 등급 - 매물이 많아도 가격 변동이 크면 낮은 쪽(변동계수 등급)을 따름
    @Test
    void gradeDropsWhenPricesVary() {
        // 20건, 평균 10,000원 ± 3,000원(변동계수 0.3) → MEDIUM
        List<Long> medium = LongStream.range(0, 20)
                .mapToObj(i -> i % 2 == 0 ? 7_000L : 13_000L)
                .toList();
        assertThat(ConfidenceRule.variationCoefficient(medium)).isEqualTo(0.3);
        assertThat(ConfidenceRule.grade(medium, CRITERIA)).isEqualTo(AnalysisConfidence.MEDIUM);

        // 20건, 평균 10,000원 ± 5,000원(변동계수 0.5) → LOW
        List<Long> low = LongStream.range(0, 20)
                .mapToObj(i -> i % 2 == 0 ? 5_000L : 15_000L)
                .toList();
        assertThat(ConfidenceRule.grade(low, CRITERIA)).isEqualTo(AnalysisConfidence.LOW);
    }

    // 조회 시점 - 분석 후 24시간이 지나면 한 단계 낮춤(LOW는 그대로), 저장값이 없으면 null
    @Test
    void currentDowngradesStaleAnalysis() {
        LocalDateTime analyzedAt = LocalDateTime.of(2026, 10, 3, 0, 0);
        LocalDateTime fresh = analyzedAt.plusHours(23);
        LocalDateTime stale = analyzedAt.plusHours(24);

        assertThat(ConfidenceRule.current(AnalysisConfidence.HIGH, analyzedAt, fresh, CRITERIA))
                .isEqualTo(AnalysisConfidence.HIGH);
        assertThat(ConfidenceRule.current(AnalysisConfidence.HIGH, analyzedAt, stale, CRITERIA))
                .isEqualTo(AnalysisConfidence.MEDIUM);
        assertThat(ConfidenceRule.current(AnalysisConfidence.MEDIUM, analyzedAt, stale, CRITERIA))
                .isEqualTo(AnalysisConfidence.LOW);
        assertThat(ConfidenceRule.current(AnalysisConfidence.LOW, analyzedAt, stale, CRITERIA))
                .isEqualTo(AnalysisConfidence.LOW);
        assertThat(ConfidenceRule.current(null, analyzedAt, stale, CRITERIA)).isNull();
    }

    private static List<Long> same(int count) {
        return Collections.nCopies(count, 10_000L);
    }
}
