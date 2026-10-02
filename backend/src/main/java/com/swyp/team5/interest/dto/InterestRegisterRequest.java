package com.swyp.team5.interest.dto;

import jakarta.validation.constraints.NotNull;

import com.swyp.team5.item.entity.ListingSource;

public record InterestRegisterRequest(
        @NotNull(message = "상품 출처를 선택해 주세요.") ListingSource source, // 등록 대상 종류(OUR/EXTERNAL)
        @NotNull(message = "관심 등록할 상품을 선택해 주세요.") Long targetId) {} // OUR이면 productId, EXTERNAL이면 listingId
