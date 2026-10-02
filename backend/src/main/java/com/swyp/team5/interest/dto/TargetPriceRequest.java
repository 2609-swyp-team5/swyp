package com.swyp.team5.interest.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

public record TargetPriceRequest(
        @NotNull(message = "목표 가격을 입력해 주세요.") @Positive(message = "목표 가격은 0원보다 커야 해요.") Long targetPrice) {}
