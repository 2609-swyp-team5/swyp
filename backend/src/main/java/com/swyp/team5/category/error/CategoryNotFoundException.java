package com.swyp.team5.category.error;

import com.swyp.team5.common.error.LogDetail;

public class CategoryNotFoundException extends RuntimeException implements LogDetail {

    private final String logDetail;

    public CategoryNotFoundException(Long categoryId) {
        super("존재하지 않는 카테고리예요.");
        this.logDetail = "categoryId=" + categoryId;
    }

    public CategoryNotFoundException() {
        super("등록된 카테고리가 없어요.");
        this.logDetail = null;
    }

    @Override
    public String logDetail() {
        return logDetail;
    }
}
