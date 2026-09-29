package com.swyp.team5.product.dto;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

import com.swyp.team5.category.dto.CategoryResponse;
import com.swyp.team5.component.entity.Component;
import com.swyp.team5.product.entity.DefectStatus;
import com.swyp.team5.product.entity.DeliveryType;
import com.swyp.team5.product.entity.Product;
import com.swyp.team5.product.entity.ProductCondition;
import com.swyp.team5.product.entity.ProductImage;
import com.swyp.team5.product.entity.ProductStatus;
import com.swyp.team5.product.entity.TradeMethod;
import com.swyp.team5.productanalysis.entity.AnalysisRecommendation;
import com.swyp.team5.tag.entity.Tag;

public record ProductResponse(
        Long id, // 상품 ID
        Long memberId, // 판매자(등록자) 회원 ID
        String nickname, // 판매자 닉네임
        CategoryResponse category, // 카테고리 정보
        String title, // 상품 제목
        String brand, // 브랜드
        String description, // 상품 설명
        Long price, // 판매 희망가
        ProductStatus status, // 게시 상태
        ProductCondition condition, // 상품 상태 등급
        DefectStatus defectStatus, // 결함(하자) 상태 (NORMAL/ISSUES/UNKNOWN)
        LocalDate purchasedAt, // 구매 일시
        Integer purchasedMonths, // 구매 후 경과 개월 수 (구매 일시 없으면 null)
        boolean allowPriceSuggestion, // 가격 제안 허용 여부
        TradeMethod tradeMethod, // 거래 방식
        DeliveryType deliveryType, // 배송비 부담 방식
        String preferredTradeRegion, // 희망 거래 지역
        List<String> imageUrls, // 상품 이미지 URL 목록 (등록 순서)
        List<String> tags, // 태그 이름 목록
        List<String> includedItems, // 구성품 이름 목록
        AnalysisRecommendation recommendation, // 가장 최근 시세 분석 판단(지금 팔기/기다리기 등), 분석 이력 없으면 null
        Long marketAveragePrice, // 비교 매물(수집 데이터) 평균가 — AI 제안가와 별개. 등록/상세 응답에만 포함, 비교 매물 부족 시 null
        Long suggestedPrice, // AI 제안가(등록 시 AI 추정가, 이후 시세 분석이 적정가를 내면 그 값으로 갱신, 없으면 null)
        String analysisDescription, // 등록 시 AI 사진 분석의 상태 등급/제안가 판단 근거(저장값, AI 분석 실패 시 null)
        LocalDateTime createdAt, // 등록 일시
        LocalDateTime updatedAt) { // 수정 일시

    /** 시세 정보(판단/평균가) 없이 상품 정보만 내려줄 때 사용한다(수정/상태 변경 응답). */
    public static ProductResponse from(Product product) {
        return from(product, null, null);
    }

    /**
     * 시세 정보까지 함께 내려줄 때 사용한다(등록/상세 응답).
     *
     * @param recommendation 가장 최근 시세 분석 판단(없으면 null)
     * @param marketAveragePrice 비교 매물 평균가(없으면 null)
     */
    public static ProductResponse from(
            Product product, AnalysisRecommendation recommendation, Long marketAveragePrice) {
        return new ProductResponse(
                product.getId(),
                product.getMember().getId(),
                product.getMember().getNickname(),
                CategoryResponse.from(product.getCategory()),
                product.getTitle(),
                product.getBrand(),
                product.getDescription(),
                product.getPrice(),
                product.getStatus(),
                product.getCondition(),
                product.getDefectStatus(),
                product.getPurchasedAt(),
                product.calculatePurchasedMonths(),
                product.isAllowPriceSuggestion(),
                product.getTradeMethod(),
                product.getDeliveryType(),
                product.getPreferredTradeRegion(),
                product.getImages().stream().map(ProductImage::getImageUrl).toList(),
                product.getTags().stream().map(Tag::getName).toList(),
                product.getComponents().stream().map(Component::getName).toList(),
                recommendation,
                marketAveragePrice,
                product.getSuggestedPrice(),
                product.getAnalysisDescription(),
                product.getCreatedAt(),
                product.getUpdatedAt());
    }
}
