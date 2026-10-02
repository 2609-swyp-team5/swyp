package com.swyp.team5.product.dto;

/** 상품 목록 조회(통합 검색)의 정렬 기준. 같은 정렬값끼리는 등록일시 최신순으로 정렬한다. */
public enum ProductSortType {
    RECOMMENDED, // 추천순: 가장 최근 시세 분석 추천이 BUY인 항목 우선
    LATEST, // 최신순(등록일시 내림차순)
    INTEREST, // 관심순: 관심상품 등록 수 내림차순
    PRICE_HIGH, // 높은 가격순
    PRICE_LOW // 낮은 가격순
}
