package com.swyp.team5.platform.repository;

/**
 * 수집 매물 가격 집계 결과({@link PlatformListingRepository#findPriceStats}).
 *
 * @param count 집계 대상 매물 수
 * @param averagePrice 평균 가격(매물이 없으면 {@code null})
 */
public record ListingPriceStats(Long count, Double averagePrice) {}
