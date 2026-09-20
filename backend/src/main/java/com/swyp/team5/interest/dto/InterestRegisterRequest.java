package com.swyp.team5.interest.dto;

import jakarta.validation.constraints.NotNull;

import com.swyp.team5.product.dto.ListingSource;

public record InterestRegisterRequest(
        @NotNull(message = "source는 필수입니다.") ListingSource source, // 등록 대상 종류(OUR/EXTERNAL)
        @NotNull(message = "targetId는 필수입니다.") Long targetId) {} // OUR이면 productId, EXTERNAL이면 listingId
