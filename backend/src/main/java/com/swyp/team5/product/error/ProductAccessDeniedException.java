package com.swyp.team5.product.error;

public class ProductAccessDeniedException extends RuntimeException {

    public ProductAccessDeniedException(Long productId) {
        super("해당 상품에 대한 권한이 없습니다. productId=" + productId);
    }
}
