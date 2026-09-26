package com.swyp.team5.product.error;

public class ProductImageRequiredException extends RuntimeException {

    public ProductImageRequiredException() {
        super("상품 이미지는 1장 이상 필요합니다.");
    }
}
