package com.swyp.team5.product.dto;

import java.time.LocalDateTime;

import com.swyp.team5.product.entity.DefectStatus;
import com.swyp.team5.product.entity.Product;
import com.swyp.team5.product.entity.ProductCondition;
import com.swyp.team5.product.entity.ProductStatus;
import com.swyp.team5.productanalysis.entity.AnalysisRecommendation;
import com.swyp.team5.productanalysis.entity.ProductAnalysis;

public record ProductSummaryResponse(
        Long id, // 상품 ID
        String title, // 상품 제목
        String brand, // 브랜드 (없으면 null)
        Long price, // 판매 희망가
        Long soldPrice, // 최종 판매 가격(판매 완료 시 판매자가 직접 입력) — 내 상품 목록만, 미입력·판매 완료 전·공개 목록(인기 상품)은 null
        String soldPlatform, // 최종 판매 플랫폼명(판매자 자유 입력 — 게시 플랫폼과 별개) — 내 상품 목록만, 그 외 null
        ProductStatus status, // 게시 상태
        ProductCondition condition, // 상품 상태 등급
        DefectStatus defectStatus, // 결함(하자) 상태
        Integer purchasedMonths, // 구매 후 경과 개월 수 (구매 일시 없으면 null)
        String categoryName, // 카테고리명
        String thumbnailUrl, // 대표(첫 번째) 이미지 URL, 이미지 없으면 null
        AnalysisRecommendation recommendation, // 가장 최근 시세 분석 판단, 분석 이력 없으면 null
        Long marketAveragePrice, // 가장 최근 시세 분석의 비교 매물 평균가(수집 데이터 기반), 분석 이력 없으면 null
        LocalDateTime createdAt, // 등록 일시
        boolean favorite, // 조회자 본인의 관심 등록 여부 — 인기 상품만 채우고 비로그인·내 상품 목록은 false
        Long interestId) { // 조회자 본인의 관심 ID(관심 해제 DELETE /interests/{id}용) — favorite이 false면 null

    /** 시세 분석 이력이 없는 상품(신규 등록 직후 등)에 사용한다. */
    public static ProductSummaryResponse from(Product product) {
        return from(product, null);
    }

    /** 판매자 본인 목록(내 상품 목록)용 — 최종 판매 정보를 포함한다. */
    public static ProductSummaryResponse from(Product product, ProductAnalysis analysis) {
        return from(product, analysis, true, null);
    }

    /**
     * @param includeSoldInfo 최종 판매 가격·플랫폼을 채울지(판매자 본인 목록일 때만 true, 인기 상품 등 공개 목록은 false)
     * @param interestId 조회자 본인의 관심 ID(관심 등록 안 했거나 비로그인이면 null)
     */
    public static ProductSummaryResponse from(
            Product product, ProductAnalysis analysis, boolean includeSoldInfo, Long interestId) {
        String thumbnailUrl = product.getImages().isEmpty()
                ? null
                : product.getImages().get(0).getImageUrl();
        return new ProductSummaryResponse(
                product.getId(),
                product.getTitle(),
                product.getBrand(),
                product.getPrice(),
                includeSoldInfo ? product.getSoldPrice() : null,
                includeSoldInfo ? product.getSoldPlatform() : null,
                product.getStatus(),
                product.getCondition(),
                product.getDefectStatus(),
                product.calculatePurchasedMonths(),
                product.getCategory().getName(),
                thumbnailUrl,
                analysis == null ? null : analysis.getRecommendation(),
                analysis == null ? null : analysis.getAveragePrice(),
                product.getCreatedAt(),
                interestId != null,
                interestId);
    }
}
