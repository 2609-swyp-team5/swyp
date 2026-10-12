package com.swyp.team5.product.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;

/** 판매 희망가만 변경하는 요청(상품 수정과 같은 가격 규칙 — 0원 이상). */
public record ProductPriceUpdateRequest(@NotNull @PositiveOrZero Long price) {}
