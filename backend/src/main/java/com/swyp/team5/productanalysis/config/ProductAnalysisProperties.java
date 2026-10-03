package com.swyp.team5.productanalysis.config;

import jakarta.validation.constraints.NotNull;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

/** 시세 분석(감가/추천) 배치 설정. */
@Validated
@ConfigurationProperties(prefix = "analysis")
public record ProductAnalysisProperties(
        @NotNull Integer minListings, // 분석에 필요한 최소 유사 매물 수(후보/최종 선별 모두 미만이면 분석 건너뜀)
        @NotNull Integer freshnessHours, // 비교 매물로 인정할 최근 수집 기준 시간
        @NotNull Integer sampleSize, // 상품명 키워드로 고른 유사 매물 후보(AI 프롬프트에 포함) 최대 개수
        @NotNull Long aiCallIntervalMs, // AI 호출 간 최소 대기 시간(무료 티어 RPM 제한 대응)
        Confidence confidence) { // 신뢰도 기준(없으면 기본값)

    public ProductAnalysisProperties {
        if (confidence == null) {
            confidence = Confidence.DEFAULT;
        }
    }

    /**
     * 신뢰도 기준. 비율(%)은 통계에 쓴 매물 수 ÷ {@code fullListings} × 100(최대 100)이고, 등급은 비율 구간과 가격 변동계수
     * (표준편차 ÷ 평균) 구간 중 낮은 쪽이다. 분석한 지 {@code staleHours}가 지나면 조회 시 한 단계 낮춘다.
     */
    public record Confidence(
            @NotNull Integer fullListings, // 비율 100%가 되는 매물 수
            @NotNull Integer highRate, // HIGH 최소 비율(%)
            @NotNull Integer mediumRate, // MEDIUM 최소 비율(%)
            @NotNull Double highVariation, // HIGH 최대 변동계수
            @NotNull Double mediumVariation, // MEDIUM 최대 변동계수
            @NotNull Integer staleHours) { // 이 시간이 지난 분석은 등급을 한 단계 낮춤

        public static final Confidence DEFAULT = new Confidence(20, 70, 40, 0.2, 0.4, 24);
    }
}
