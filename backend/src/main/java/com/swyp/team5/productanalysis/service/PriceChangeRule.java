package com.swyp.team5.productanalysis.service;

import java.math.BigDecimal;

import com.swyp.team5.productanalysis.entity.AnalysisConfidence;

/**
 * 시세 변동 알림을 보낼 만한 변화인지 판단한다. 새 분석의 평균 시세가 직전 분석보다 {@value #ALERT_THRESHOLD_PERCENT}% 이상
 * 오르거나 내렸을 때만 알린다. 비교 매물이 적어 신뢰도가 낮은(LOW) 분석은 오차가 커 알리지 않는다(신뢰도 도입 이전 스냅샷처럼
 * 등급이 없으면 낮은 것으로 보지 않음).
 */
final class PriceChangeRule {

    static final int ALERT_THRESHOLD_PERCENT = 5;

    private static final BigDecimal ALERT_THRESHOLD_RATE = BigDecimal.valueOf(ALERT_THRESHOLD_PERCENT, 2);

    private PriceChangeRule() {}

    /**
     * @param changeRate 직전 분석 대비 평균 시세 변화율(0.05 = 5%), 직전 분석이 없으면 null
     */
    static boolean shouldAlert(BigDecimal changeRate, AnalysisConfidence confidence) {
        return changeRate != null
                && confidence != AnalysisConfidence.LOW
                && changeRate.abs().compareTo(ALERT_THRESHOLD_RATE) >= 0;
    }
}
