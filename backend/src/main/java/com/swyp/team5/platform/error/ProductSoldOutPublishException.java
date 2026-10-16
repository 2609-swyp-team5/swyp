package com.swyp.team5.platform.error;

import com.swyp.team5.common.error.LogDetail;

/** 판매 완료된 상품을 외부 플랫폼에 게시하려 할 때. 이미 팔린 물건이 외부에 판매중으로 올라가지 않도록 브라우저를 띄우기 전에 거절한다. */
public class ProductSoldOutPublishException extends RuntimeException implements LogDetail {

    private final String logDetail;

    public ProductSoldOutPublishException(Long productId, String platformName) {
        super("판매 완료된 상품은 게시할 수 없어요.");
        this.logDetail = "productId=" + productId + ", platform=" + platformName;
    }

    @Override
    public String logDetail() {
        return logDetail;
    }
}
