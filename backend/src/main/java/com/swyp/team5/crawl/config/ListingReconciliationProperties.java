package com.swyp.team5.crawl.config;

import jakarta.validation.constraints.NotNull;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

/** 매물 재확인(reconciliation) 배치 설정. */
@Validated
@ConfigurationProperties(prefix = "crawl.bunjang.reconcile")
public record ListingReconciliationProperties(
        @NotNull Integer staleAfterHours, // 이 시간 넘게 갱신 안 된 SELLING 매물을 재확인 대상으로 삼음
        @NotNull Integer batchSize, // 한 사이클에 재확인할 최대 매물 수
        @NotNull Long callIntervalMs) {} // 개별 호출 간 최소 대기 시간
