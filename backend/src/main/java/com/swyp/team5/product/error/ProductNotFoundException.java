package com.swyp.team5.product.error;

import com.swyp.team5.common.error.LogDetail;

public class ProductNotFoundException extends RuntimeException implements LogDetail {

    private final String logDetail;

    public ProductNotFoundException(Long productId) {
        super("존재하지 않는 상품이에요.");
        this.logDetail = "productId=" + productId;
    }

    @Override
    public String logDetail() {
        return logDetail;
    }
}
