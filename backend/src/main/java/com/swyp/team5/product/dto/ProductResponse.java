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
        Long suggestedPrice, // AI 제안가(등록 시 AI 추정가, 이후 시세 분석이 적정가를 내면 그 값으로 갱신, 없으면 null)
        String analysisDescription, // AI가 상태 등급/적정가를 그렇게 판단한 근거(직접/AI 등록 응답에만 포함, 그 외에는 null)
        LocalDateTime createdAt, // 등록 일시
        LocalDateTime updatedAt) { // 수정 일시

    /** 시세 분석 이력이 없는 상품(신규 등록 직후 등)에 사용한다. */
    public static ProductResponse from(Product product) {
        return from(product, null);
    }

    public static ProductResponse from(Product product, AnalysisRecommendation recommendation) {
        return from(product, recommendation, null);
    }

    /**
     * 등록 직후, AI가 제안가를 그렇게 판단한 근거({@code analysisDescription})를 함께 내려줄 때 사용한다
     * (AI 등록, 그리고 AI 분석이 성공한 직접 등록).
     */
    public static ProductResponse fromAiAnalysis(Product product, String analysisDescription) {
        return from(product, null, analysisDescription);
    }

    private static ProductResponse from(
            Product product, AnalysisRecommendation recommendation, String analysisDescription) {
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
                product.getSuggestedPrice(),
                analysisDescription,
                product.getCreatedAt(),
                product.getUpdatedAt());
    }
}
