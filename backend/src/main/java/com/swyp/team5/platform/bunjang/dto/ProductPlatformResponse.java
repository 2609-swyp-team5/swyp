package com.swyp.team5.platform.bunjang.dto;

import java.time.LocalDateTime;

import com.swyp.team5.platform.entity.ProductPlatform;
import com.swyp.team5.platform.entity.ProductPlatformStatus;

public record ProductPlatformResponse(
        Long productPlatformId,
        Long productId,
        String externalProductId,
        String productUrl,
        ProductPlatformStatus status,
        LocalDateTime updatedAt) {

    public static ProductPlatformResponse from(ProductPlatform productPlatform) {
        return new ProductPlatformResponse(
                productPlatform.getId(),
                productPlatform.getProduct().getId(),
                productPlatform.getExternalProductId(),
                productPlatform.getProductUrl(),
                productPlatform.getStatus(),
                productPlatform.getUpdatedAt());
    }
}
