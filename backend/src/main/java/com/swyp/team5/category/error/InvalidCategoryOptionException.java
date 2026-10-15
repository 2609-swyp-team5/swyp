package com.swyp.team5.category.error;

import com.swyp.team5.common.error.LogDetail;

/** 카테고리별 추가 항목 입력이 옵션 정의와 맞지 않거나 필수 항목이 빠진 경우. */
public class InvalidCategoryOptionException extends RuntimeException implements LogDetail {

    private final String logDetail;

    public InvalidCategoryOptionException(String message, String logDetail) {
        super(message);
        this.logDetail = logDetail;
    }

    @Override
    public String logDetail() {
        return logDetail;
    }
}
