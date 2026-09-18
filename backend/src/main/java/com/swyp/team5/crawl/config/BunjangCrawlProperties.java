package com.swyp.team5.crawl.config;

import java.time.Duration;

import jakarta.validation.constraints.NotNull;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

/**
 * 번개장터 시세 수집(크롤링) 설정.
 *
 * <p>카테고리 매핑({@code categories} ↔ 번개장터 자체 categoryId)은 {@code category_platforms}
 * 테이블에서 관리한다(2026-09-18, 플랫폼이 늘어도 스키마 변경 없이 row만 추가하도록 YAML에서 이전 —
 * 상세는 docs/시세수집-번개장터-API-참고.md 참고).
 */
@Validated
@ConfigurationProperties(prefix = "crawl.bunjang")
public record BunjangCrawlProperties(
        @NotNull Integer pageLimit, @NotNull Duration dedupeTtl, @NotNull Duration cacheTtl) {}
