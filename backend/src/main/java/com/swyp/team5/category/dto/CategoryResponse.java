package com.swyp.team5.category.dto;

import com.swyp.team5.category.entity.Category;

/** {@code leaf}가 true인 최하위 카테고리만 상품 등록/수정에 쓸 수 있다. */
public record CategoryResponse(Long id, String name, Long parentId, boolean leaf) {

    public static CategoryResponse from(Category category) {
        return new CategoryResponse(
                category.getId(),
                category.getName(),
                category.getParent() != null ? category.getParent().getId() : null,
                category.isLeaf());
    }
}
