package com.swyp.team5.product.dto;

import java.time.LocalDateTime;

import com.swyp.team5.product.entity.Product;
import com.swyp.team5.product.entity.ProductCondition;
import com.swyp.team5.product.entity.ProductStatus;
import com.swyp.team5.productanalysis.entity.AnalysisRecommendation;

public record ProductSummaryResponse(
        Long id, // 상품 ID
        String title, // 상품 제목
        Long price, // 판매 희망가
        ProductStatus status, // 게시 상태
        ProductCondition condition, // 상품 상태 등급
        String categoryName, // 카테고리명
        String thumbnailUrl, // 대표(첫 번째) 이미지 URL, 이미지 없으면 null
        AnalysisRecommendation recommendation, // 가장 최근 시세 분석 판단, 분석 이력 없으면 null
        LocalDateTime createdAt) { // 등록 일시

    /** 시세 분석 이력이 없는 상품(신규 등록 직후 등)에 사용한다. */
    public static ProductSummaryResponse from(Product product) {
        return from(product, null);
    }

    public static ProductSummaryResponse from(Product product, AnalysisRecommendation recommendation) {
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
                recommendation,
                product.getCreatedAt());
    }
}
