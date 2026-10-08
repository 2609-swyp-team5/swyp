package com.swyp.team5.product.dto;

import java.time.LocalDateTime;

import com.swyp.team5.product.entity.Product;
import com.swyp.team5.product.entity.ProductStatus;

/** 판매 관리 화면의 상품 개요(판매자 본인 전용). 판매 완료 정보는 판매자가 판매 완료로 바꿀 때 직접 입력한 값이다. */
public record ProductManagementOverviewResponse(
        Long id, // 상품 ID
        String title, // 상품 제목
        Long price, // 판매 희망가(등록가)
        ProductStatus status, // 상품 상태 DRAFT/ON_SALE/RESERVED/SOLD_OUT
        LocalDateTime createdAt, // 등록 일시
        Long soldPrice, // 최종 판매 가격, 미입력·판매 완료 전이면 null
        String soldPlatform) { // 최종 판매 플랫폼명(판매자 자유 입력 — 게시 플랫폼과 별개), 미입력·판매 완료 전이면 null

    public static ProductManagementOverviewResponse from(Product product) {
        return new ProductManagementOverviewResponse(
                product.getId(),
                product.getTitle(),
                product.getPrice(),
                product.getStatus(),
                product.getCreatedAt(),
                product.getSoldPrice(),
                product.getSoldPlatform());
    }
}
