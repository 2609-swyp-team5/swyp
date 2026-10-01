package com.swyp.team5.product.dto;

import java.util.Set;

import com.swyp.team5.product.entity.ProductStatus;

/**
 * 상품 목록 조회(통합 검색)의 거래 상태 필터 값. 외부 매물은 수집한 원본 상태 문자열과 이름이 같고, 우리 상품은
 * {@link #ourStatuses}에 대응한다(외부 게시 전 {@code DRAFT}도 구매자 입장에서는 판매중).
 */
public enum ListingTradeStatus {
    SELLING(Set.of(ProductStatus.DRAFT, ProductStatus.ON_SALE)),
    RESERVED(Set.of()), // 우리 상품에는 예약중 상태가 없다
    SOLD_OUT(Set.of(ProductStatus.SOLD_OUT));

    private final Set<ProductStatus> ourStatuses;

    ListingTradeStatus(Set<ProductStatus> ourStatuses) {
        this.ourStatuses = ourStatuses;
    }

    public Set<ProductStatus> ourStatuses() {
        return ourStatuses;
    }
}
