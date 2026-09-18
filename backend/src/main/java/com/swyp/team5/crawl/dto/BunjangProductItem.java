package com.swyp.team5.crawl.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

/**
 * 번개장터 카테고리 목록 API 응답의 상품 항목 중 시세 수집에 필요한 필드만 파싱한다.
 *
 * @param productImage 매물 대표 이미지 URL. {@code {res}} 해상도 플레이스홀더가 포함될 수 있다(원본 그대로 저장).
 */
@JsonIgnoreProperties(ignoreUnknown = true)
public record BunjangProductItem(long pid, String name, long price, String status, boolean ad, String productImage) {}
