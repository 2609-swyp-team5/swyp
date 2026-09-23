package com.swyp.team5.platform.error;

public class ProductPlatformPublishInProgressException extends RuntimeException {

    public ProductPlatformPublishInProgressException(Long productId, String platformName) {
        super("이미 등록이 진행 중인 상품입니다. productId=" + productId + ", platform=" + platformName);
    }
}
