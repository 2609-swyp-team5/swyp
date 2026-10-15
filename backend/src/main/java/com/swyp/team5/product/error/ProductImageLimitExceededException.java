package com.swyp.team5.product.error;

public class ProductImageLimitExceededException extends RuntimeException {

    public ProductImageLimitExceededException() {
        super("상품 사진은 최대 10장까지 등록할 수 있어요.");
    }
}
