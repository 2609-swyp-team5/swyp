package com.swyp.team5.crawl.client.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

/**
 * 번개장터 카테고리 목록 API 응답의 상품 항목 중 시세 수집에 필요한 필드만 파싱한다. 필드 목록
 * 전체는 docs/시세수집-번개장터-API-참고.md 참고.
 */
@JsonIgnoreProperties(ignoreUnknown = true)
public record BunjangProductItem(long pid, String name, long price, String status, boolean ad) {}
