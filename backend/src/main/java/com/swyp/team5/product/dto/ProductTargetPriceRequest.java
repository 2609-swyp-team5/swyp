package com.swyp.team5.product.dto;

import jakarta.validation.constraints.Positive;

/** 목표 판매가 설정 요청. {@code targetPrice}가 {@code null}이면 목표가를 해제한다. */
public record ProductTargetPriceRequest(@Positive(message = "목표 가격은 0원보다 커야 해요.") Long targetPrice) {}
