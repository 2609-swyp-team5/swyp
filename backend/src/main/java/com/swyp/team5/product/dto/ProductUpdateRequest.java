package com.swyp.team5.product.dto;

import java.util.List;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;

import com.swyp.team5.category.dto.CategoryOptionSelection;
import com.swyp.team5.product.entity.DefectStatus;
import com.swyp.team5.product.entity.DeliveryType;
import com.swyp.team5.product.entity.IncludedStatus;
import com.swyp.team5.product.entity.ProductCondition;
import com.swyp.team5.product.entity.ProductStatus;
import com.swyp.team5.product.entity.TradeMethod;

public record ProductUpdateRequest(
        @NotNull Long categoryId, // 카테고리 ID
        @NotBlank @Size(max = 100) String title, // 상품 제목
        @Size(max = 50) String brand, // 브랜드 (선택)
        String description, // 상품 설명 (선택)
        @NotNull @PositiveOrZero Long price, // 판매 희망가
        @NotNull ProductStatus status, // 게시 상태 (DRAFT/ON_SALE/SOLD_OUT)
        @NotNull ProductCondition condition, // 상품 상태 등급 (S/A/B/C/D)
        DefectStatus defectStatus, // 기존 요청 호환용(새 수정 화면에서는 사용하지 않음)
        @PositiveOrZero @Max(6) Integer purchasedMonths, // 구매 후 경과 개월 수 (0~6, 수정 시점 기준 구매일시로 재계산, null이면 구매일시 비움)
        boolean allowPriceSuggestion, // 가격 제안 허용 여부
        @NotNull TradeMethod tradeMethod, // 거래 방식 (직거래/택배)
        DeliveryType deliveryType, // 배송비 부담 방식 (택배 거래 시)
        @Size(max = 100) String preferredTradeRegion, // 희망 거래 지역 (선택)
        List<@NotBlank String> imageUrls, // 유지할 기존 이미지 URL 목록 (새 파일(images 파트)은 이 뒤에 이어 붙어 전체 교체, 합쳐서 1장 이상)
        List<@NotBlank @Size(max = 50) String> tags, // 태그 이름 목록 (전체 교체, 선택)
        List<@NotBlank @Size(max = 50) String> includedItems, // 구성품 이름 목록 (전체 교체, 선택)
        List<@Valid CategoryOptionSelection> categoryOptions, // 카테고리별 추가 항목(미입력 시 서버 기본값 적용)
        IncludedStatus includedStatus, // 구성품 상태(NONE/PARTIAL/ALL)
        @Min(2700) @Max(17000) Long deliveryFee) { // 배송비 별도일 때 배송비

    /** 이전 클라이언트 요청과 기존 테스트 데이터도 읽을 수 있도록 구 요청 형태를 유지한다. */
    public ProductUpdateRequest(
            Long categoryId,
            String title,
            String brand,
            String description,
            Long price,
            ProductStatus status,
            ProductCondition condition,
            DefectStatus defectStatus,
            Integer purchasedMonths,
            boolean allowPriceSuggestion,
            TradeMethod tradeMethod,
            DeliveryType deliveryType,
            String preferredTradeRegion,
            List<String> imageUrls,
            List<String> tags,
            List<String> includedItems,
            List<CategoryOptionSelection> categoryOptions) {
        this(
                categoryId,
                title,
                brand,
                description,
                price,
                status,
                condition,
                defectStatus,
                purchasedMonths,
                allowPriceSuggestion,
                tradeMethod,
                deliveryType,
                preferredTradeRegion,
                imageUrls,
                tags,
                includedItems,
                categoryOptions,
                null,
                null);
    }
}
