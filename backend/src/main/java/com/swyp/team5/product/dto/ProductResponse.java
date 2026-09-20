package com.swyp.team5.product.dto;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.List;

import com.swyp.team5.category.dto.CategoryResponse;
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
        String description, // 상품 설명
        Long price, // 판매 희망가
        ProductStatus status, // 게시 상태
        ProductCondition condition, // 상품 상태 등급
        boolean hasDefect, // 결함 여부
        LocalDate purchasedAt, // 구매 일시
        Integer purchasedMonths, // 구매 후 경과 개월 수 (구매 일시 없으면 null)
        boolean allowPriceSuggestion, // 가격 제안 허용 여부
        TradeMethod tradeMethod, // 거래 방식
        DeliveryType deliveryType, // 배송비 부담 방식
        String preferredTradeRegion, // 희망 거래 지역
        List<String> imageUrls, // 상품 이미지 URL 목록 (등록 순서)
        List<String> tags, // 태그 이름 목록
        AnalysisRecommendation recommendation, // 가장 최근 시세 분석 판단(지금 팔기/기다리기 등), 분석 이력 없으면 null
        Long suggestedPrice, // AI가 제안한 적정가(AI 등록 응답에만 포함, 그 외에는 null)
        String analysisDescription, // AI가 상태 등급/적정가를 그렇게 판단한 근거(AI 등록 응답에만 포함, 그 외에는 null)
        LocalDateTime createdAt, // 등록 일시
        LocalDateTime updatedAt) { // 수정 일시

    /** 시세 분석 이력이 없는 상품(신규 등록 직후 등)에 사용한다. */
    public static ProductResponse from(Product product) {
        return from(product, null);
    }

    public static ProductResponse from(Product product, AnalysisRecommendation recommendation) {
        return from(product, recommendation, null, null);
    }

    /**
     * AI 이미지 분석으로 등록한 직후, AI가 제안한 적정가({@code suggestedPrice})와 판단 근거
     * ({@code analysisDescription})를 함께 내려줄 때 사용한다.
     */
    public static ProductResponse fromAiAnalysis(Product product, Long suggestedPrice, String analysisDescription) {
        return from(product, null, suggestedPrice, analysisDescription);
    }

    private static ProductResponse from(
            Product product, AnalysisRecommendation recommendation, Long suggestedPrice, String analysisDescription) {
        return new ProductResponse(
                product.getId(),
                product.getMember().getId(),
                product.getMember().getNickname(),
                CategoryResponse.from(product.getCategory()),
                product.getTitle(),
                product.getDescription(),
                product.getPrice(),
                product.getStatus(),
                product.getCondition(),
                product.isHasDefect(),
                product.getPurchasedAt(),
                // 구매 일시가 null이면 null을 반환, 그렇지 않으면 현재 날짜와 구매 날짜의 차이를 개월 수로 계산
                product.getPurchasedAt() == null
                        ? null
                        : (int) ChronoUnit.MONTHS.between(product.getPurchasedAt(), LocalDate.now()),
                product.isAllowPriceSuggestion(),
                product.getTradeMethod(),
                product.getDeliveryType(),
                product.getPreferredTradeRegion(),
                product.getImages().stream().map(ProductImage::getImageUrl).toList(),
                product.getTags().stream().map(Tag::getName).toList(),
                recommendation,
                suggestedPrice,
                analysisDescription,
                product.getCreatedAt(),
                product.getUpdatedAt());
    }
}
