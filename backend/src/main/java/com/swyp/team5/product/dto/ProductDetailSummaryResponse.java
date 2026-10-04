package com.swyp.team5.product.dto;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.List;

import com.swyp.team5.category.dto.CategoryResponse;
import com.swyp.team5.item.entity.ListingSource;
import com.swyp.team5.product.entity.ProductCondition;
import com.swyp.team5.product.entity.ProductStatus;

/**
 * 상품 상세 요약 응답(판매 관리 화면의 요약 영역용). 우리 상품과 외부 수집 매물을 같은 형태로 내려주며, 외부 매물에 없는
 * 정보(브랜드·설명·상태 등급·태그·구성품·조회수)는 {@code null}이거나 빈 목록이다. 시세 정보는 {@code /analysis}에서 따로 조회한다.
 */
public record ProductDetailSummaryResponse(
        ListingSource source, // OUR/EXTERNAL
        Long id, // 상품 ID(외부 매물이면 listing_id)
        String title, // 상품 제목
        String brand, // 브랜드, 외부 매물은 null
        String description, // 상품 설명, 외부 매물은 null
        CategoryResponse category, // 카테고리 정보
        Long price, // 판매 희망가(외부 매물은 판매가)
        List<String> imageUrls, // 상품 이미지 URL 목록(등록 순서)
        List<String> tags, // 태그 이름 목록, 외부 매물은 []
        List<String> includedItems, // 구성품 이름 목록, 외부 매물은 []
        ProductCondition condition, // 상품 상태 등급(S/A/B/C/D), 외부 매물은 null
        ProductStatus status, // 게시 상태(외부 매물은 판매중·예약중=ON_SALE, 그 외=SOLD_OUT)
        LocalDateTime createdAt, // 등록 일시(외부 매물은 최초 수집 일시)
        LocalDateTime updatedAt, // 수정 일시(외부 매물은 마지막으로 판매 상태를 확인한 일시)
        Long viewCount, // 조회수(본인 제외, 회원·비회원 IP당 24시간 1회), 외부 매물은 null
        Long interestCount, // 관심 등록한 회원 수
        Long daysOnSale, // 등록일(외부 매물은 최초 수집일)부터 오늘까지 일수, 등록 당일이 1
        List<PlatformLink> platforms) { // 우리 상품은 게시 완료(POSTED)된 외부 게시글, 외부 매물은 원본 매물 1건(없으면 [])

    /** 상품이 올라가 있는 외부 플랫폼 게시글 링크. */
    public record PlatformLink(
            String platformName, // 플랫폼명(예: 번개장터)
            String productUrl) {} // 게시글 바로가기 URL

    /**
     * 상세 응답에서 요약 필드만 골라 만든다.
     *
     * @param detail 시세 정보 없이 만든 상세 응답(관심 수·조회수 포함)
     * @param platforms 게시글 링크 목록
     * @param today 판매 일수 계산 기준일
     */
    public static ProductDetailSummaryResponse of(
            ProductResponse detail, List<PlatformLink> platforms, LocalDate today) {
        return new ProductDetailSummaryResponse(
                detail.source(),
                detail.id(),
                detail.title(),
                detail.brand(),
                detail.description(),
                detail.category(),
                detail.price(),
                detail.imageUrls(),
                detail.tags(),
                detail.includedItems(),
                detail.condition(),
                detail.status(),
                detail.createdAt(),
                detail.updatedAt(),
                detail.viewCount(),
                detail.interestCount(),
                daysOnSale(detail.createdAt(), today),
                platforms);
    }

    private static Long daysOnSale(LocalDateTime createdAt, LocalDate today) {
        if (createdAt == null) {
            return null;
        }
        return Math.max(1, ChronoUnit.DAYS.between(createdAt.toLocalDate(), today) + 1);
    }
}
