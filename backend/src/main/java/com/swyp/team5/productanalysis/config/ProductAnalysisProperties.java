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
        @NotNull Long aiCallIntervalMs) {} // AI 호출 간 최소 대기 시간(무료 티어 RPM 제한 대응)
