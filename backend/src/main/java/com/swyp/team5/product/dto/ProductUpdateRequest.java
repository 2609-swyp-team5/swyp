package com.swyp.team5.product.dto;

import java.util.List;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;

import com.swyp.team5.product.entity.DeliveryType;
import com.swyp.team5.product.entity.ProductCondition;
import com.swyp.team5.product.entity.ProductStatus;
import com.swyp.team5.product.entity.TradeMethod;

public record ProductUpdateRequest(
        @NotNull Long categoryId, // 카테고리 ID
        @NotBlank @Size(max = 100) String title, // 상품 제목
        String description, // 상품 설명 (선택)
        @NotNull @PositiveOrZero Long price, // 판매 희망가
        @NotNull ProductStatus status, // 게시 상태 (ON_SALE/RESERVED/SOLD_OUT/HIDDEN)
        @NotNull ProductCondition condition, // 상품 상태 등급 (S/A/B/C)
        boolean hasDefect, // 결함 여부
        boolean allowPriceSuggestion, // 가격 제안 허용 여부
        @NotNull TradeMethod tradeMethod, // 거래 방식 (직거래/택배)
        DeliveryType deliveryType, // 배송비 부담 방식 (택배 거래 시)
        @Size(max = 100) String preferredTradeRegion, // 희망 거래 지역 (선택)
        @NotEmpty List<@NotBlank String> imageUrls, // 상품 이미지 URL 목록 (전체 교체)
        List<@NotBlank @Size(max = 50) String> tags) {} // 태그 이름 목록 (전체 교체, 선택)
