package com.swyp.team5.category.error;

public class CategoryNotFoundException extends RuntimeException {

    public CategoryNotFoundException(Long categoryId) {
        super("존재하지 않는 카테고리입니다. categoryId=" + categoryId);
    }

    public CategoryNotFoundException() {
        super("등록된 카테고리가 없습니다.");
    }
}
