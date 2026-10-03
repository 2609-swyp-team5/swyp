package com.swyp.team5.productanalysis.service;

import java.util.OptionalDouble;

import com.swyp.team5.productanalysis.entity.AnalysisRecommendation;

/**
 * 시세 분석 추천을 정하는 규칙. 판매자 관점(SELL/HOLD)과 구매자 관점(BUY/WAIT)을 따로 정하고, AI가 낸 추천이 이 규칙과
 * 다르면 규칙 결과를 쓴다(AI는 같은 물건 선별·적정가·근거 문장을 맡음).
 *
 * <ul>
 *   <li>판매자: 시세가 월 {@value #TREND_THRESHOLD_PERCENT}% 이상 오르는 중이면 HOLD(기다리면 더 비싸게 팔 수 있음), 그 밖에는
 *       SELL(중고는 시간이 지날수록 값이 떨어지므로 기본은 판매, 등록가가 시세보다 높으면 적정가로 낮춰 판매 권장)
 *   <li>구매자: 판매가가 시세보다 {@value #PRICE_GAP_THRESHOLD_PERCENT}% 이상 싸면 BUY, 비싸면 WAIT. 그 사이면 시세가 월
 *       {@value #TREND_THRESHOLD_PERCENT}% 이상 오르는 중이면 BUY(오르기 전에 구매), 내리는 중이면 WAIT(기다리면 더 싸짐),
 *       뚜렷한 추세가 없으면 적정 가격이라 BUY
 * </ul>
 *
 * <p>추세(월 변화율)는 {@link PriceTrend#monthlyRate()} — 관측 기간이 짧아 추세를 판단할 수 없으면 추세 조건은 보지 않는다.
 */
final class RecommendationRule {

    static final int PRICE_GAP_THRESHOLD_PERCENT = 5;
    static final int TREND_THRESHOLD_PERCENT = 3;

    private static final double PRICE_GAP_THRESHOLD = PRICE_GAP_THRESHOLD_PERCENT / 100.0;
    private static final double TREND_THRESHOLD = TREND_THRESHOLD_PERCENT / 100.0;

    private RecommendationRule() {}

    /** 판매자 관점 추천(SELL/HOLD). */
    static AnalysisRecommendation forSeller(OptionalDouble monthlyRate) {
        return isRising(monthlyRate) ? AnalysisRecommendation.HOLD : AnalysisRecommendation.SELL;
    }

    /**
     * 구매자 관점 추천(BUY/WAIT).
     *
     * @param price 판매가(우리 상품은 등록가)
     * @param averagePrice 같은 물건 매물 평균가
     */
    static AnalysisRecommendation forBuyer(long price, long averagePrice, OptionalDouble monthlyRate) {
        double gap = priceGap(price, averagePrice);
        if (gap <= -PRICE_GAP_THRESHOLD) {
            return AnalysisRecommendation.BUY;
        }
        if (gap >= PRICE_GAP_THRESHOLD) {
            return AnalysisRecommendation.WAIT;
        }
        if (isFalling(monthlyRate)) {
            return AnalysisRecommendation.WAIT;
        }
        return AnalysisRecommendation.BUY;
    }

    /** AI 근거 문장이 규칙과 다른 추천을 말할 때 대신 쓰는 판매자 관점 근거. */
    static String sellerReason(
            AnalysisRecommendation recommendation, long price, long averagePrice, OptionalDouble monthlyRate) {
        if (recommendation == AnalysisRecommendation.HOLD) {
            return "같은 물건 시세가 %s 오르고 있어요. 조금 기다리면 더 비싸게 팔 수 있어요.".formatted(trendText(monthlyRate));
        }
        double gap = priceGap(price, averagePrice);
        if (gap >= PRICE_GAP_THRESHOLD) {
            return "등록가가 같은 물건 평균 시세(%,d원)보다 %.0f%% 높아요. 시세가 오를 근거가 없어 가격을 낮춰 지금 파는 걸 추천해요."
                    .formatted(averagePrice, gap * 100);
        }
        return "같은 물건 시세가 오를 근거가 없고 중고 가격은 시간이 지날수록 떨어지는 편이라, 지금 파는 걸 추천해요.";
    }

    /** AI 근거 문장이 규칙과 다른 추천을 말할 때 대신 쓰는 구매자 관점 근거. */
    static String buyerReason(
            AnalysisRecommendation recommendation, long price, long averagePrice, OptionalDouble monthlyRate) {
        double gap = priceGap(price, averagePrice);
        if (recommendation == AnalysisRecommendation.BUY) {
            if (gap <= -PRICE_GAP_THRESHOLD) {
                return "판매가가 같은 물건 평균 시세(%,d원)보다 %.0f%% 저렴해요. 지금 사는 걸 추천해요.".formatted(averagePrice, -gap * 100);
            }
            if (isRising(monthlyRate)) {
                return "같은 물건 시세가 %s 오르고 있어요. 더 오르기 전에 사는 걸 추천해요.".formatted(trendText(monthlyRate));
            }
            return "판매가가 같은 물건 평균 시세(%,d원)와 비슷한 적정 가격이에요. 지금 사도 좋아요.".formatted(averagePrice);
        }
        if (gap >= PRICE_GAP_THRESHOLD) {
            return "판매가가 같은 물건 평균 시세(%,d원)보다 %.0f%% 비싸요. 조금 더 기다려 보세요.".formatted(averagePrice, gap * 100);
        }
        return "같은 물건 시세가 %s 내려가고 있어요. 기다리면 더 싸게 살 수 있어요.".formatted(trendText(monthlyRate));
    }

    private static boolean isRising(OptionalDouble monthlyRate) {
        return monthlyRate.isPresent() && monthlyRate.getAsDouble() >= TREND_THRESHOLD;
    }

    private static boolean isFalling(OptionalDouble monthlyRate) {
        return monthlyRate.isPresent() && monthlyRate.getAsDouble() <= -TREND_THRESHOLD;
    }

    /** (판매가 − 평균가) / 평균가. 평균가가 0이면 0(가격 비교 불가). */
    private static double priceGap(long price, long averagePrice) {
        return averagePrice == 0 ? 0 : (double) (price - averagePrice) / averagePrice;
    }

    private static String trendText(OptionalDouble monthlyRate) {
        return "한 달에 약 %.1f%%".formatted(Math.abs(monthlyRate.orElse(0)) * 100);
    }
}
