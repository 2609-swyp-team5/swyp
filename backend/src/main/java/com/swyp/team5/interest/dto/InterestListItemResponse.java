package com.swyp.team5.interest.dto;

import java.time.LocalDateTime;

import com.swyp.team5.interest.entity.Interest;
import com.swyp.team5.item.entity.ListingSource;
import com.swyp.team5.platform.entity.PlatformListing;
import com.swyp.team5.product.entity.Product;
import com.swyp.team5.product.entity.ProductCondition;
import com.swyp.team5.product.entity.ProductStatus;
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
        String status, // 상품 상태 DRAFT/ON_SALE/RESERVED/SOLD_OUT — 외부 매물은 원본 상태를 변환(SELLING→ON_SALE, RESERVED→RESERVED,
        // 그 외→SOLD_OUT)
        ProductCondition condition, // 외부 매물은 상태 등급 개념이 없어 null
        String categoryName, // 카테고리명
        String thumbnailUrl, // 대표 이미지 URL
        AnalysisRecommendation recommendation, // 분석 이력 없으면 null(외부 매물은 구매자 관점 BUY/WAIT만)
        InterestStatus interestStatus, // 관심상품 상태 BUY(구매추천)/WAIT(관찰중)/SOLD_OUT(판매종료)/PENDING(분석대기) — 조회 시 계산
        Long marketAveragePrice, // 분석 이력 없으면 null
        String platformName, // 우리 상품은 null, 외부 매물은 수집 플랫폼명(예: "번개장터")
        String externalUrl, // 우리 상품은 null, 외부 매물은 원본 매물 링크
        Long targetPrice, // 설정한 목표가, 미설정이면 null
        LocalDateTime createdAt) { // 관심상품 등록 일시

    /** {@code interest.getProduct()}/{@code interest.getListing()} 중 채워진 쪽으로 자동 분기한다. */
    public static InterestListItemResponse from(Interest interest, AnalysisRecommendation recommendation) {
        return interest.getProduct() != null
                ? fromProduct(interest, recommendation, null)
                : fromListing(interest, recommendation, null);
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
                InterestStatus.of(product.getStatus(), recommendation),
                marketAveragePrice,
                null,
                null,
                interest.getTargetPrice(),
                interest.getCreatedAt());
    }

    /** 외부 매물 대상 건 — 관심 매물 시세 분석 스냅샷이 없으면 {@code recommendation}/{@code marketAveragePrice}는 null. */
    public static InterestListItemResponse fromListing(
            Interest interest, AnalysisRecommendation recommendation, Long marketAveragePrice) {
        PlatformListing listing = interest.getListing();
        ProductStatus status = ProductStatus.fromExternal(listing.getStatus());
        return new InterestListItemResponse(
                interest.getId(),
                ListingSource.EXTERNAL,
                listing.getId(),
                listing.getTitle(),
                listing.getPrice(),
                status.name(),
                null,
                listing.getCategory().getName(),
                listing.getImageUrl(),
                recommendation,
                InterestStatus.of(status, recommendation),
                marketAveragePrice,
                listing.getPlatform().getName(),
                listing.getListingUrl(),
                interest.getTargetPrice(),
                interest.getCreatedAt());
    }
}
