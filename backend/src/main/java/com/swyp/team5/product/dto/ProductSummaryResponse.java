package com.swyp.team5.product.dto;

import java.time.LocalDateTime;

import com.swyp.team5.product.entity.Product;
import com.swyp.team5.product.entity.ProductCondition;
import com.swyp.team5.product.entity.ProductStatus;

public record ProductSummaryResponse(
        Long id, // 상품 ID
        String title, // 상품 제목
        Long price, // 판매 희망가
        ProductStatus status, // 게시 상태
        ProductCondition condition, // 상품 상태 등급
        String categoryName, // 카테고리명
        String thumbnailUrl, // 대표(첫 번째) 이미지 URL, 이미지 없으면 null
        LocalDateTime createdAt) { // 등록 일시

    public static ProductSummaryResponse from(Product product) {
        String thumbnailUrl = product.getImages().isEmpty()
                ? null
                : product.getImages().get(0).getImageUrl();
        return new ProductSummaryResponse(
                product.getId(),
                product.getTitle(),
                product.getPrice(),
                product.getStatus(),
                product.getCondition(),
                product.getCategory().getName(),
                thumbnailUrl,
                product.getCreatedAt());
    }
}
