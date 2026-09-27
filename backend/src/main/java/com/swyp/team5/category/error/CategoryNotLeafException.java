package com.swyp.team5.category.error;

/** 상품은 최하위(리프) 카테고리에만 등록할 수 있다(번개장터 등록 화면이 최하위까지 선택을 요구). */
public class CategoryNotLeafException extends RuntimeException {

    public CategoryNotLeafException(Long categoryId) {
        super("최하위 카테고리를 선택해 주세요. categoryId=" + categoryId);
    }
}
