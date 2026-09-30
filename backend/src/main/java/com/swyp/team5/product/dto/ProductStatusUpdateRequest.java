package com.swyp.team5.product.dto;

import jakarta.validation.constraints.NotNull;

import com.swyp.team5.product.entity.ProductStatus;

public record ProductStatusUpdateRequest(@NotNull ProductStatus status) {} // 변경할 게시 상태 (DRAFT/ON_SALE/SOLD_OUT)
