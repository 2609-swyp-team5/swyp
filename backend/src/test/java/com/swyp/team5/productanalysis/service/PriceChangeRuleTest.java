package com.swyp.team5.productanalysis.service;

import static org.assertj.core.api.Assertions.assertThat;

import java.math.BigDecimal;

import com.swyp.team5.productanalysis.entity.AnalysisConfidence;
import org.junit.jupiter.api.Test;

// 시세 변동 알림 기준(±5%, 신뢰도 LOW 제외) 단위 테스트.
class PriceChangeRuleTest {

    // 직전 대비 5% 이상 오르거나 내리면 알림
    @Test
    void alertsWhenChangeIsAtLeastFivePercentEitherWay() {
        assertThat(PriceChangeRule.shouldAlert(new BigDecimal("0.0500"), AnalysisConfidence.MEDIUM))
                .isTrue();
        assertThat(PriceChangeRule.shouldAlert(new BigDecimal("-0.0812"), AnalysisConfidence.HIGH))
                .isTrue();
    }

    // 5% 미만 변화, 직전 분석 없음(변화율 null)이면 알리지 않음
    @Test
    void skipsSmallChangeOrMissingPrevious() {
        assertThat(PriceChangeRule.shouldAlert(new BigDecimal("0.0499"), AnalysisConfidence.HIGH))
                .isFalse();
        assertThat(PriceChangeRule.shouldAlert(null, AnalysisConfidence.HIGH)).isFalse();
    }

    // 신뢰도 LOW 분석은 알리지 않고, 신뢰도 도입 이전(등급 없음)은 낮은 것으로 보지 않음
    @Test
    void skipsLowConfidenceButNotMissingGrade() {
        assertThat(PriceChangeRule.shouldAlert(new BigDecimal("0.2000"), AnalysisConfidence.LOW))
                .isFalse();
        assertThat(PriceChangeRule.shouldAlert(new BigDecimal("0.2000"), null)).isTrue();
    }
}
