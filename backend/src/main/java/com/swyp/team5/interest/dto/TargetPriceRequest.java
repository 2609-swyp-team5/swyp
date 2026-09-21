package com.swyp.team5.interest.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

public record TargetPriceRequest(
        @NotNull(message = "목표 가격은 필수입니다.") @Positive(message = "목표 가격은 0보다 커야 합니다.") Long targetPrice) {}
