package com.swyp.team5.product.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;

import com.swyp.team5.product.entity.ProductStatus;

@SoldInfoOnlyForSoldOut
public record ProductStatusUpdateRequest(
        @NotNull ProductStatus status, // 변경할 게시 상태 (DRAFT/ON_SALE/RESERVED/SOLD_OUT)
        @PositiveOrZero Long soldPrice, // 최종 판매 가격(선택, SOLD_OUT일 때만 보낼 수 있음 — 생략하면 기존 값 유지)
        @Size(max = 30) String soldPlatform) { // 최종 판매 플랫폼명(선택, SOLD_OUT일 때만 — 자유 입력 예: 번개장터·당근, 게시 플랫폼과 별개)

    public ProductStatusUpdateRequest(ProductStatus status) {
        this(status, null, null);
    }
}
