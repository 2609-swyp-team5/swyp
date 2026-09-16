package com.swyp.team5.category.dto;

import com.swyp.team5.category.entity.Category;

public record CategoryResponse(Long id, String name, Long parentId) {

    public static CategoryResponse from(Category category) {
        return new CategoryResponse(
                category.getId(),
                category.getName(),
                category.getParent() != null ? category.getParent().getId() : null);
    }
}
