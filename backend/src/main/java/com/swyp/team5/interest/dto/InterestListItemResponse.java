package com.swyp.team5.interest.dto;

import java.time.LocalDateTime;

import com.swyp.team5.interest.entity.Interest;
import com.swyp.team5.platform.entity.PlatformListing;
import com.swyp.team5.product.dto.ListingSource;
import com.swyp.team5.product.entity.Product;
import com.swyp.team5.product.entity.ProductCondition;
import com.swyp.team5.productanalysis.entity.AnalysisRecommendation;

/**
 * 관심상품 목록의 항목 — 상품 목록 조회({@code ProductListItemResponse})와 동일한 카드 정보 + 관심상품
 * 고유 정보(목표가 등)를 함께 내려준다. 우리 상품/외부 매물 어느 쪽을 대상으로 하든 한 형태로 반환한다.
 */
public record InterestListItemResponse(
        Long interestId,
        ListingSource source, // OUR/EXTERNAL
        Long targetId, // source 내에서만 유일 — 우리 상품이면 productId, 외부 매물이면 listingId
        String title,
        Long price,
        String status, // 우리 상품은 ProductStatus 이름 그대로, 외부 매물은 원본 status 문자열
        ProductCondition condition, // 외부 매물은 상태 등급 개념이 없어 null
        String categoryName, // 카테고리명
        String thumbnailUrl, // 대표 이미지 URL
        AnalysisRecommendation recommendation, // 외부 매물은 null, 분석 이력 없으면 null
        Long marketAveragePrice, // 외부 매물은 null, 분석 이력 없으면 null
        String platformName, // 우리 상품은 null, 외부 매물은 수집 플랫폼명(예: "번개장터")
        String externalUrl, // 우리 상품은 null, 외부 매물은 원본 매물 링크
        Long targetPrice, // 설정한 목표가, 미설정이면 null
        LocalDateTime createdAt) { // 관심상품 등록 일시

    /** {@code interest.getProduct()}/{@code interest.getListing()} 중 채워진 쪽으로 자동 분기한다. */
    public static InterestListItemResponse from(Interest interest, AnalysisRecommendation recommendation) {
        return interest.getProduct() != null ? fromProduct(interest, recommendation, null) : fromListing(interest);
    }

    /** 대상 상품의 최근 시세 분석 스냅샷까지 함께 반영하고 싶을 때 사용한다({@code marketAveragePrice} 포함). */
    public static InterestListItemResponse fromProduct(
            Interest interest, AnalysisRecommendation recommendation, Long marketAveragePrice) {
        Product product = interest.getProduct();
        String thumbnailUrl = product.getImages().isEmpty()
                ? null
                : product.getImages().get(0).getImageUrl();
        return new InterestListItemResponse(
                interest.getId(),
                ListingSource.OUR,
                product.getId(),
                product.getTitle(),
                product.getPrice(),
                product.getStatus().name(),
                product.getCondition(),
                product.getCategory().getName(),
                thumbnailUrl,
                recommendation,
                marketAveragePrice,
                null,
                null,
                interest.getTargetPrice(),
                interest.getCreatedAt());
    }

    public static InterestListItemResponse fromListing(Interest interest) {
        PlatformListing listing = interest.getListing();
        return new InterestListItemResponse(
                interest.getId(),
                ListingSource.EXTERNAL,
                listing.getId(),
                listing.getTitle(),
                listing.getPrice(),
                listing.getStatus(),
                null,
                listing.getCategory().getName(),
                listing.getImageUrl(),
                null,
                null,
                listing.getPlatform().getName(),
                listing.getListingUrl(),
                interest.getTargetPrice(),
                interest.getCreatedAt());
    }
}
