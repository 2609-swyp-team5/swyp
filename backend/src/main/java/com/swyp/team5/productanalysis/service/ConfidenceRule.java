package com.swyp.team5.productanalysis.service;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.List;

import com.swyp.team5.productanalysis.config.ProductAnalysisProperties;
import com.swyp.team5.productanalysis.entity.AnalysisConfidence;

/**
 * 시세 분석 신뢰도를 정하는 규칙({@link ProductAnalysisProperties.Confidence} 기준).
 *
 * <ul>
 *   <li>비율(%): 통계에 쓴 매물 수 ÷ 기준 매물 수 × 100(최대 100) — 매물 수만으로 정한다
 *   <li>등급: 비율 구간과 가격 변동계수(표준편차 ÷ 평균) 구간 중 낮은 쪽 — 매물이 많아도 가격이 들쭉날쭉하면 낮아진다
 *   <li>최신성: 분석한 지 기준 시간이 지났으면 조회 시 등급을 한 단계 낮춘다(분석이 계속 건너뛰어져 오래된 경우)
 * </ul>
 */
final class ConfidenceRule {

    private ConfidenceRule() {}

    /** 매물 수 기반 신뢰도 비율(0~100). */
    static int rate(int listingCount, ProductAnalysisProperties.Confidence criteria) {
        return Math.min(100, listingCount * 100 / criteria.fullListings());
    }

    /** 분석 시점 등급 — 통계에 쓴 매물 가격들로 비율 등급과 변동계수 등급 중 낮은 쪽을 고른다. */
    static AnalysisConfidence grade(List<Long> prices, ProductAnalysisProperties.Confidence criteria) {
        int rate = rate(prices.size(), criteria);
        AnalysisConfidence byRate = rate >= criteria.highRate()
                ? AnalysisConfidence.HIGH
                : rate >= criteria.mediumRate() ? AnalysisConfidence.MEDIUM : AnalysisConfidence.LOW;
        double variation = variationCoefficient(prices);
        AnalysisConfidence byVariation = variation <= criteria.highVariation()
                ? AnalysisConfidence.HIGH
                : variation <= criteria.mediumVariation() ? AnalysisConfidence.MEDIUM : AnalysisConfidence.LOW;
        return lower(byRate, byVariation);
    }

    /** 조회 시점 등급 — 분석한 지 기준 시간이 지났으면 한 단계 낮춘다. 저장된 등급이 없으면 null. */
    static AnalysisConfidence current(
            AnalysisConfidence stored,
            LocalDateTime analyzedAt,
            LocalDateTime now,
            ProductAnalysisProperties.Confidence criteria) {
        if (stored == null || Duration.between(analyzedAt, now).toHours() < criteria.staleHours()) {
            return stored;
        }
        return stored == AnalysisConfidence.HIGH ? AnalysisConfidence.MEDIUM : AnalysisConfidence.LOW;
    }

    /** 모표준편차 ÷ 평균. 평균이 0이면 비교할 수 없어 무한대(가장 낮은 등급)로 본다. */
    static double variationCoefficient(List<Long> prices) {
        double mean = prices.stream().mapToLong(Long::longValue).average().orElse(0);
        if (mean == 0) {
            return Double.POSITIVE_INFINITY;
        }
        double variance = prices.stream()
                .mapToDouble(price -> (price - mean) * (price - mean))
                .average()
                .orElse(0);
        return Math.sqrt(variance) / mean;
    }

    private static AnalysisConfidence lower(AnalysisConfidence a, AnalysisConfidence b) {
        return a.ordinal() >= b.ordinal() ? a : b;
    }
}
