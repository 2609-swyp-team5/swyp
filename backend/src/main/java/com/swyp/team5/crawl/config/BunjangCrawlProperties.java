package com.swyp.team5.crawl.config;

import jakarta.validation.constraints.NotNull;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

/**
 * 번개장터 시세 수집(크롤링) 설정.
 *
 * <p>카테고리 매핑({@code categories} ↔ 번개장터 자체 categoryId)은 {@code category_platforms}
 * 테이블에서 관리한다
 */
@Validated
@ConfigurationProperties(prefix = "crawl.bunjang")
public record BunjangCrawlProperties(@NotNull Integer pageLimit) {}
