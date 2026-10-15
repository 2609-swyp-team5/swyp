package com.swyp.team5.product.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

/** 판매 희망가만 변경하는 요청(상품 등록·수정과 같은 가격 규칙). */
public record ProductPriceUpdateRequest(
        @NotNull
                @Min(value = 500, message = "희망 가격은 500원 이상 1억 원 이하로 입력해 주세요.")
                @Max(value = 100_000_000, message = "희망 가격은 500원 이상 1억 원 이하로 입력해 주세요.")
                Long price) {}
