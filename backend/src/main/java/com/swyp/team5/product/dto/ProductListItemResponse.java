package com.swyp.team5.product.dto;

import java.time.LocalDateTime;

import com.swyp.team5.item.entity.ListingSource;
import com.swyp.team5.platform.entity.PlatformListing;
import com.swyp.team5.product.entity.DefectStatus;
import com.swyp.team5.product.entity.Product;
import com.swyp.team5.product.entity.ProductCondition;
import com.swyp.team5.product.entity.ProductStatus;
import com.swyp.team5.product.entity.TradeMethod;
import com.swyp.team5.productanalysis.entity.AnalysisRecommendation;
import com.swyp.team5.productanalysis.entity.ProductAnalysis;

/** 상품 목록 조회(통합 검색)의 항목 — 우리 회원 상품과 외부 수집 매물을 한 목록에 섞어 반환한다. */
public record ProductListItemResponse(
        ListingSource source, // OUR/EXTERNAL
        Long id, // source 내에서만 유일(우리 상품 id 또는 외부 매물 listing_id)
        String title,
        String brand, // 외부 매물은 null
        Long price,
        String status, // 상품 상태 DRAFT/ON_SALE/RESERVED/SOLD_OUT — 외부 매물은 원본 상태를 변환(SELLING→ON_SALE, RESERVED→RESERVED,
        // 그 외→SOLD_OUT)
        ProductCondition condition, // 외부 매물은 상태 등급 개념이 없어 null
        DefectStatus defectStatus, // 외부 매물은 null
        Integer purchasedMonths, // 구매 후 경과 개월 수, 구매 일시가 없거나 외부 매물이면 null
        String categoryName,
        String tradeRegion, // 우리 상품의 희망 거래 지역(없으면 null), 외부 매물은 아직 수집하지 않아 null
        Boolean deliveryAvailable, // 택배 거래 가능 여부(우리 상품은 거래 방식이 택배면 true, 직거래면 false), 외부 매물은 true 고정(번개장터는 사실상 택배 가능)
        String thumbnailUrl,
        AnalysisRecommendation recommendation, // 가장 최근 시세 분석 추천(외부 매물은 관심 등록돼 분석된 경우만), 없으면 null
        Long marketAveragePrice, // 가장 최근 시세 분석 평균가, 없으면 null
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
                product.getPreferredTradeRegion(),
                product.getTradeMethod() == TradeMethod.DELIVERY,
                thumbnailUrl,
                analysis == null ? null : analysis.getRecommendation(),
                analysis == null ? null : analysis.getAveragePrice(),
                null,
                null,
                product.getCreatedAt());
    }

    public static ProductListItemResponse fromListing(PlatformListing listing, ProductAnalysis analysis) {
        return new ProductListItemResponse(
                ListingSource.EXTERNAL,
                listing.getId(),
                listing.getTitle(),
                null,
                listing.getPrice(),
                ProductStatus.fromExternal(listing.getStatus()).name(),
                null,
                null,
                null,
                listing.getCategory().getName(),
                null,
                true, // 수집 API에 택배 정보가 없어 고정 — 표본 매물이 모두 택배 가능(2026-10-02 확인)
                listing.getImageUrl(),
                analysis == null ? null : analysis.getRecommendation(),
                analysis == null ? null : analysis.getAveragePrice(),
                listing.getPlatform().getName(),
                listing.getListingUrl(),
                listing.getCreatedAt());
    }
}
