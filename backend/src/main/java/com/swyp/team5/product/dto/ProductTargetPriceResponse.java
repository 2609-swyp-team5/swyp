package com.swyp.team5.product.dto;

import com.swyp.team5.product.entity.Product;

/** 판매자 목표 판매가 응답. 비교 기준은 최근 시세 분석 평균가다. */
public record ProductTargetPriceResponse(
        Long productId, // 상품 ID
        Long targetPrice, // 목표 판매가(미설정이면 null)
        Long averagePrice, // 최근 시세 분석 평균가(분석이 없으면 null)
        boolean reached) { // 목표가가 있고 평균가가 목표가 이상이면 true

    public static ProductTargetPriceResponse of(Product product, Long averagePrice) {
        Long targetPrice = product.getTargetPrice();
        boolean reached = targetPrice != null && averagePrice != null && averagePrice >= targetPrice;
        return new ProductTargetPriceResponse(product.getId(), targetPrice, averagePrice, reached);
    }
}
