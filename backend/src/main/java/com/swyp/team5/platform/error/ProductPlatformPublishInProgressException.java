package com.swyp.team5.platform.error;

import com.swyp.team5.common.error.LogDetail;

public class ProductPlatformPublishInProgressException extends RuntimeException implements LogDetail {

    private final String logDetail;

    public ProductPlatformPublishInProgressException(Long productId, String platformName) {
        super("이미 등록이 진행 중인 상품이에요. 잠시 후 다시 확인해 주세요.");
        this.logDetail = "productId=" + productId + ", platform=" + platformName;
    }

    @Override
    public String logDetail() {
        return logDetail;
    }
}
