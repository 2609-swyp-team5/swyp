package com.swyp.team5.product.error;

import com.swyp.team5.common.error.LogDetail;

/** 상품 등록·수정 정책에 맞지 않는 요청. */
public class InvalidProductRequestException extends RuntimeException implements LogDetail {

    private final String field;

    public InvalidProductRequestException(String field, String message) {
        super(message);
        this.field = field;
    }

    public String field() {
        return field;
    }

    @Override
    public String logDetail() {
        return "field=" + field;
    }
}
