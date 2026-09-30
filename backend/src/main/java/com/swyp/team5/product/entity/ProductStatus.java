package com.swyp.team5.product.entity;

import java.util.List;

/** 상품 판매 상태 */
public enum ProductStatus {
    /** 등록됨(외부 플랫폼 미게시) — 등록 직후 기본값 */
    DRAFT,
    /** 판매중(외부 플랫폼에 게시됨) */
    ON_SALE,
    /** 품절 */
    SOLD_OUT;

    /** 시세 분석·시세 수집 대상 상태(외부 게시 전 상품도 시세를 보여주기 위해 {@link #DRAFT} 포함). */
    public static final List<ProductStatus> ANALYSIS_TARGETS = List.of(DRAFT, ON_SALE);
}
