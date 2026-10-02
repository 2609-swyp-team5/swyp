package com.swyp.team5.product.error;

import com.swyp.team5.common.error.LogDetail;

public class ProductAccessDeniedException extends RuntimeException implements LogDetail {

    private final String logDetail;

    public ProductAccessDeniedException(Long productId) {
        super("이 상품에 대한 권한이 없어요.");
        this.logDetail = "productId=" + productId;
    }

    @Override
    public String logDetail() {
        return logDetail;
    }
}
