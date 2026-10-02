package com.swyp.team5.product.error;

/** 상품 목록 조회(통합 검색) 조건이 올바르지 않은 경우(최소 가격이 최대 가격보다 큼, 해석할 수 없는 커서 등). */
public class InvalidProductSearchException extends RuntimeException {

    public InvalidProductSearchException(String message) {
        super(message);
    }
}
