package com.swyp.team5.platform.error;

public class ProductPlatformNotFoundException extends RuntimeException {

    public ProductPlatformNotFoundException(Long productId, String platformName) {
        super("연동된 외부 게시글이 없습니다. productId=" + productId + ", platform=" + platformName);
    }
}
