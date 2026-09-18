package com.swyp.team5.product.dto;

import java.util.List;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;

import com.swyp.team5.product.entity.DeliveryType;
import com.swyp.team5.product.entity.ProductCondition;
import com.swyp.team5.product.entity.TradeMethod;

public record ProductCreateRequest(
        @NotNull Long categoryId, // 카테고리 ID
        @NotBlank @Size(max = 100) String title, // 상품 제목
        String description, // 상품 설명 (선택)
        @NotNull @PositiveOrZero Long price, // 판매 희망가
        @NotNull ProductCondition condition, // 상품 상태 등급
        boolean hasDefect, // 결함 여부
        @PositiveOrZero @Max(6) Integer purchasedMonths, // 구매 후 경과 개월 수 (0~6, 등록 시점 기준 구매일시로 변환 -> 프론트로 내려줄 값)
        boolean allowPriceSuggestion, // 가격 제안 허용 여부
        @NotNull TradeMethod tradeMethod, // 거래 방식 (직거래/택배)
        DeliveryType deliveryType, // 배송비 부담 방식 (택배 거래 시)
        @Size(max = 100) String preferredTradeRegion, // 희망 거래 지역 (선택)
        @NotEmpty List<@NotBlank String> imageUrls, // 업로드된 상품 이미지 URL 목록 (순서대로 저장)
        List<@NotBlank @Size(max = 50) String> tags) {} // 태그 이름 목록 (선택)
