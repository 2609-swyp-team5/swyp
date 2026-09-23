package com.swyp.team5.platform.error;

public class ProductPlatformAlreadyLinkedException extends RuntimeException {

    public ProductPlatformAlreadyLinkedException(Long productId, String platformName) {
        super("이미 연동된 상품입니다. productId=" + productId + ", platform=" + platformName);
    }
}
