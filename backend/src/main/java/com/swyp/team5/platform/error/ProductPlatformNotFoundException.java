package com.swyp.team5.platform.error;

import com.swyp.team5.common.error.LogDetail;

public class ProductPlatformNotFoundException extends RuntimeException implements LogDetail {

    private final String logDetail;

    public ProductPlatformNotFoundException(Long productId, String platformName) {
        super("연동된 외부 게시글이 없어요.");
        this.logDetail = "productId=" + productId + ", platform=" + platformName;
    }

    @Override
    public String logDetail() {
        return logDetail;
    }
}
