package com.swyp.team5.productanalysis.dto;

/** 경쟁 상품 목록 정렬 기준. 같은 정렬값끼리는 최신 등록 순(최초 수집 일시 내림차순)으로 정렬한다. */
public enum CompetitionSortType {
    LATEST, // 최신순(기본)
    PRICE_LOW, // 낮은 가격순
    PRICE_HIGH // 높은 가격순
}
