package com.swyp.team5.product.dto;

import java.time.LocalDateTime;

import com.swyp.team5.platform.entity.PlatformType;
import com.swyp.team5.platform.entity.ProductPlatform;
import com.swyp.team5.platform.entity.ProductPlatformStatus;

/**
 * 상품이 외부 플랫폼에 게시(연동)된 상태. 상품 상세에서 판매자 본인에게만 내려준다.
 *
 * @param platform 플랫폼 코드(예: BUNJANG)
 * @param platformName 화면에 표시할 플랫폼명(예: 번개장터)
 * @param status 게시 상태(POSTING/POSTED/FAILED/REMOVED)
 * @param externalProductId 플랫폼의 상품 ID(게시 중이면 null)
 * @param productUrl 플랫폼 상품 바로가기 URL(게시 중이면 null)
 * @param createdAt 연동(게시 요청) 일시
 * @param updatedAt 마지막 상태 변경 일시
 */
public record ProductPlatformSummaryResponse(
        PlatformType platform,
        String platformName,
        ProductPlatformStatus status,
        String externalProductId,
        String productUrl,
        LocalDateTime createdAt,
        LocalDateTime updatedAt) {

    public static ProductPlatformSummaryResponse from(ProductPlatform productPlatform) {
        String platformName = productPlatform.getMemberPlatform().getPlatform().getName();
        return new ProductPlatformSummaryResponse(
                PlatformType.fromPlatformName(platformName),
                platformName,
                productPlatform.getStatus(),
                productPlatform.getExternalProductId(),
                productPlatform.getProductUrl(),
                productPlatform.getCreatedAt(),
                productPlatform.getUpdatedAt());
    }
}
