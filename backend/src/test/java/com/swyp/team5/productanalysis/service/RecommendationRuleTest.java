package com.swyp.team5.productanalysis.service;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.OptionalDouble;

import com.swyp.team5.productanalysis.entity.AnalysisRecommendation;
import org.junit.jupiter.api.Test;

// 시세 분석 추천 규칙 단위 테스트.
class RecommendationRuleTest {

    private static final OptionalDouble NO_TREND = OptionalDouble.empty();

    // 판매자 - 시세가 월 3% 이상 오르는 중일 때만 HOLD, 그 밖(하락·보합·추세 판단 불가)은 SELL
    @Test
    void sellerHoldsOnlyWhenPriceIsRising() {
        assertThat(RecommendationRule.forSeller(OptionalDouble.of(0.03))).isEqualTo(AnalysisRecommendation.HOLD);
        assertThat(RecommendationRule.forSeller(OptionalDouble.of(0.029))).isEqualTo(AnalysisRecommendation.SELL);
        assertThat(RecommendationRule.forSeller(OptionalDouble.of(-0.05))).isEqualTo(AnalysisRecommendation.SELL);
        assertThat(RecommendationRule.forSeller(NO_TREND)).isEqualTo(AnalysisRecommendation.SELL);
    }

    // 구매자 - 시세보다 5% 이상 싸면 BUY, 5% 이상 비싸면 WAIT(가격 차가 추세보다 우선)
    @Test
    void buyerFollowsPriceGapFirst() {
        assertThat(RecommendationRule.forBuyer(9_500, 10_000, OptionalDouble.of(-0.10)))
                .isEqualTo(AnalysisRecommendation.BUY);
        assertThat(RecommendationRule.forBuyer(10_500, 10_000, OptionalDouble.of(0.10)))
                .isEqualTo(AnalysisRecommendation.WAIT);
    }

    // 구매자 - 가격 차가 5% 이내면 하락 추세는 WAIT, 상승 추세·보합·추세 판단 불가는 BUY
    @Test
    void buyerFollowsTrendWithinFairPriceRange() {
        assertThat(RecommendationRule.forBuyer(10_000, 10_000, OptionalDouble.of(-0.03)))
                .isEqualTo(AnalysisRecommendation.WAIT);
        assertThat(RecommendationRule.forBuyer(10_000, 10_000, OptionalDouble.of(0.03)))
                .isEqualTo(AnalysisRecommendation.BUY);
        assertThat(RecommendationRule.forBuyer(10_400, 10_000, OptionalDouble.of(-0.01)))
                .isEqualTo(AnalysisRecommendation.BUY);
        assertThat(RecommendationRule.forBuyer(10_000, 10_000, NO_TREND)).isEqualTo(AnalysisRecommendation.BUY);
    }

    // 규칙 기반 근거 - HOLD는 기다리면 더 비싸게 팔 수 있다는 점을, 비싼 등록가는 가격 조정을 안내
    @Test
    void reasonsExplainTheRule() {
        assertThat(RecommendationRule.sellerReason(
                        AnalysisRecommendation.HOLD, 10_000, 10_000, OptionalDouble.of(0.05)))
                .contains("더 비싸게 팔 수 있어요");
        assertThat(RecommendationRule.sellerReason(AnalysisRecommendation.SELL, 12_000, 10_000, NO_TREND))
                .contains("20% 높아요", "가격을 낮춰");
        assertThat(RecommendationRule.buyerReason(
                        AnalysisRecommendation.WAIT, 10_000, 10_000, OptionalDouble.of(-0.04)))
                .contains("더 싸게 살 수 있어요");
    }
}
