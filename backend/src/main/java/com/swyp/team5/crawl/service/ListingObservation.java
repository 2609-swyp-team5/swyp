package com.swyp.team5.crawl.service;

import com.swyp.team5.category.entity.Category;

/**
 * 수집 중 관측한 외부 매물 1건(저장 전). 한 번의 수집이 끝나면 {@link PlatformListingBatchWriter}가 모아서 한꺼번에 저장한다.
 *
 * @param category 수집한 카테고리(이미 있는 매물도 이 값으로 바꾼다 — 카테고리 수집 규칙)
 * @param externalItemId 플랫폼의 매물 ID
 */
public record ListingObservation(
        Category category,
        String externalItemId,
        String listingUrl,
        String title,
        long price,
        String status,
        String imageUrl) {}
