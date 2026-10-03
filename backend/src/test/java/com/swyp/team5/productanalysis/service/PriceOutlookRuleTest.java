package com.swyp.team5.productanalysis.service;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.OptionalDouble;

import com.swyp.team5.productanalysis.entity.AnalysisRecommendation;
import com.swyp.team5.productanalysis.entity.ForecastPeriod;
import org.junit.jupiter.api.Test;

// 판매자 추천의 1개월 가격 전망 규칙 단위 테스트.
class PriceOutlookRuleTest {

    // HOLD - 대기 기간 1개월, 관측 월 추세(4%)만큼 오른 가격을 1,000원 단위로
    @Test
    void holdUsesObservedTrend() {
        PriceOutlookRule.Outlook outlook = PriceOutlookRule.forSeller(
                AnalysisRecommendation.HOLD, OptionalDouble.of(0.04), -0.03, 500_000L, 485_000L);

        assertThat(outlook.waitPeriod()).isEqualTo(ForecastPeriod.ONE_MONTH);
        assertThat(outlook.expectedPrice()).isEqualTo(520_000L);
        assertThat(outlook.expectedPriceChangeRate()).isEqualByComparingTo("0.04");
    }

    // HOLD - 짧은 급등(월 12%)은 최대 5%로 제한
    @Test
    void holdCapsRiseAtFivePercent() {
        PriceOutlookRule.Outlook outlook = PriceOutlookRule.forSeller(
                AnalysisRecommendation.HOLD, OptionalDouble.of(0.12), -0.03, 500_000L, 485_000L);

        assertThat(outlook.expectedPrice()).isEqualTo(525_000L);
        assertThat(outlook.expectedPriceChangeRate()).isEqualByComparingTo("0.05");
    }

    // SELL - 대기 기간 없음, 감가 예측 1M 값과 감가 예측 월 변화율
    @Test
    void sellUsesDepreciationForecast() {
        PriceOutlookRule.Outlook outlook = PriceOutlookRule.forSeller(
                AnalysisRecommendation.SELL, OptionalDouble.empty(), -0.03, 500_000L, 485_000L);

        assertThat(outlook.waitPeriod()).isNull();
        assertThat(outlook.expectedPrice()).isEqualTo(485_000L);
        assertThat(outlook.expectedPriceChangeRate()).isEqualByComparingTo("-0.03");
    }

    // SELL - 저가 상품도 변화율은 반올림 전 비율(예상가가 평균가와 같게 반올림돼도 0%로 뭉개지지 않음)
    @Test
    void sellKeepsRateForCheapItems() {
        PriceOutlookRule.Outlook outlook = PriceOutlookRule.forSeller(
                AnalysisRecommendation.SELL, OptionalDouble.of(-0.01), -0.02, 3_000L, 3_000L);

        assertThat(outlook.expectedPrice()).isEqualTo(3_000L);
        assertThat(outlook.expectedPriceChangeRate()).isEqualByComparingTo("-0.02");
    }

    // SELL - 감가 예측 월 변화율이 양수(관측 추세 상승 혼합)여도 예상가가 현재가 상한이라 변화율은 0
    @Test
    void sellNeverExpectsRise() {
        PriceOutlookRule.Outlook outlook = PriceOutlookRule.forSeller(
                AnalysisRecommendation.SELL, OptionalDouble.of(0.02), 0.01, 500_000L, 500_000L);

        assertThat(outlook.expectedPriceChangeRate()).isEqualByComparingTo("0");
    }
}
