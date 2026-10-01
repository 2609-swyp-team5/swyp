package com.swyp.team5.product.dto;

import java.time.LocalDateTime;

import com.swyp.team5.item.entity.ListingSource;

/** 상품 목록 조회(통합 검색) 쿼리의 결과 한 행 — 정렬 순서와 다음 커서 계산에 필요한 값만 담는다. */
public record ProductSearchHit(ListingSource source, Long id, LocalDateTime createdAt, Long sortKey) {

    public ProductSearchCursor toCursor() {
        return new ProductSearchCursor(sortKey, createdAt, id);
    }
}
