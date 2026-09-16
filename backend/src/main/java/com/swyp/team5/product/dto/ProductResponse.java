package com.swyp.team5.product.dto;

import java.time.LocalDateTime;
import java.util.List;

import com.swyp.team5.product.entity.DeliveryType;
import com.swyp.team5.product.entity.Product;
import com.swyp.team5.product.entity.ProductCondition;
import com.swyp.team5.product.entity.ProductImage;
import com.swyp.team5.product.entity.ProductStatus;
import com.swyp.team5.product.entity.TradeMethod;
import com.swyp.team5.tag.entity.Tag;

public record ProductResponse(
        Long id, // 상품 ID
        Long memberId, // 판매자(등록자) 회원 ID
        String nickname, // 판매자 닉네임
        Long categoryId, // 카테고리 ID
        String categoryName, // 카테고리명
        String title, // 상품 제목
        String description, // 상품 설명
        Long price, // 판매 희망가
        ProductStatus status, // 게시 상태
        ProductCondition condition, // 상품 상태 등급
        boolean hasDefect, // 결함 여부
        boolean allowPriceSuggestion, // 가격 제안 허용 여부
        TradeMethod tradeMethod, // 거래 방식
        DeliveryType deliveryType, // 배송비 부담 방식
        String preferredTradeRegion, // 희망 거래 지역
        List<String> imageUrls, // 상품 이미지 URL 목록 (등록 순서)
        List<String> tags, // 태그 이름 목록
        LocalDateTime createdAt, // 등록 일시
        LocalDateTime updatedAt) { // 수정 일시

    public static ProductResponse from(Product product) {
        return new ProductResponse(
                product.getId(),
                product.getMember().getId(),
                product.getMember().getNickname(),
                product.getCategory().getId(),
                product.getCategory().getName(),
                product.getTitle(),
                product.getDescription(),
                product.getPrice(),
                product.getStatus(),
                product.getCondition(),
                product.isHasDefect(),
                product.isAllowPriceSuggestion(),
                product.getTradeMethod(),
                product.getDeliveryType(),
                product.getPreferredTradeRegion(),
                product.getImages().stream().map(ProductImage::getImageUrl).toList(),
                product.getTags().stream().map(Tag::getName).toList(),
                product.getCreatedAt(),
                product.getUpdatedAt());
    }
}
