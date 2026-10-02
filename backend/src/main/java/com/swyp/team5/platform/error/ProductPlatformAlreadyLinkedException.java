package com.swyp.team5.platform.error;

import com.swyp.team5.common.error.LogDetail;

public class ProductPlatformAlreadyLinkedException extends RuntimeException implements LogDetail {

    private final String logDetail;

    public ProductPlatformAlreadyLinkedException(Long productId, String platformName) {
        super("이미 연동된 상품이에요.");
        this.logDetail = "productId=" + productId + ", platform=" + platformName;
    }

    @Override
    public String logDetail() {
        return logDetail;
    }
}
