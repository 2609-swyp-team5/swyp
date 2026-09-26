package com.swyp.team5.product.dto;

import java.time.LocalDateTime;

import com.swyp.team5.platform.entity.PlatformListing;
import com.swyp.team5.product.entity.DefectStatus;
import com.swyp.team5.product.entity.Product;
import com.swyp.team5.product.entity.ProductCondition;
import com.swyp.team5.productanalysis.entity.AnalysisRecommendation;
import com.swyp.team5.productanalysis.entity.ProductAnalysis;

/** 상품 목록 조회(통합 검색)의 항목 — 우리 회원 상품과 외부 수집 매물을 한 목록에 섞어 반환한다. */
public record ProductListItemResponse(
        ListingSource source, // OUR/EXTERNAL
        Long id, // source 내에서만 유일(우리 상품 id 또는 외부 매물 listing_id)
        String title,
        String brand, // 외부 매물은 null
        Long price,
        String status, // 우리 상품은 ProductStatus 이름 그대로, 외부 매물은 원본 status 문자열
        ProductCondition condition, // 외부 매물은 상태 등급 개념이 없어 null
        DefectStatus defectStatus, // 외부 매물은 null
        Integer purchasedMonths, // 구매 후 경과 개월 수, 구매 일시가 없거나 외부 매물이면 null
        String categoryName,
        String thumbnailUrl,
        AnalysisRecommendation recommendation, // 외부 매물은 null
        Long marketAveragePrice, // 외부 매물은 null
        String platformName, // 우리 상품은 null, 외부 매물은 수집 플랫폼명(예: "번개장터")
        String externalUrl, // 우리 상품은 null, 외부 매물은 원본 매물 링크
        LocalDateTime createdAt) {

    public static ProductListItemResponse fromProduct(Product product, ProductAnalysis analysis) {
        String thumbnailUrl = product.getImages().isEmpty()
                ? null
                : product.getImages().get(0).getImageUrl();
        return new ProductListItemResponse(
                ListingSource.OUR,
                product.getId(),
                product.getTitle(),
                product.getBrand(),
                product.getPrice(),
                product.getStatus().name(),
                product.getCondition(),
                product.getDefectStatus(),
                product.calculatePurchasedMonths(),
                product.getCategory().getName(),
                thumbnailUrl,
                analysis == null ? null : analysis.getRecommendation(),
                analysis == null ? null : analysis.getAveragePrice(),
                null,
                null,
                product.getCreatedAt());
    }

    public static ProductListItemResponse fromListing(PlatformListing listing) {
        return new ProductListItemResponse(
                ListingSource.EXTERNAL,
                listing.getId(),
                listing.getTitle(),
                null,
                listing.getPrice(),
                listing.getStatus(),
                null,
                null,
                null,
                listing.getCategory().getName(),
                listing.getImageUrl(),
                null,
                null,
                listing.getPlatform().getName(),
                listing.getListingUrl(),
                listing.getCreatedAt());
    }
}
