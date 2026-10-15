package com.swyp.team5.category.controller;

import java.util.List;

import lombok.RequiredArgsConstructor;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.swyp.team5.category.dto.CategoryOptionGroupResponse;
import com.swyp.team5.category.dto.CategoryResponse;
import com.swyp.team5.category.service.CategoryOptionService;
import com.swyp.team5.category.service.CategoryService;
import com.swyp.team5.common.common.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;

@Tag(name = "Category", description = "카테고리")
@RestController
@RequestMapping("/categories")
@RequiredArgsConstructor
public class CategoryController {

    private final CategoryService categoryService;
    private final CategoryOptionService categoryOptionService;

    @Operation(summary = "카테고리 목록 조회")
    @GetMapping
    public ResponseEntity<ApiResponse<List<CategoryResponse>>> getCategories() {
        return ResponseEntity.ok(ApiResponse.success(categoryService.getCategories()));
    }

    @Operation(
            summary = "카테고리별 추가 항목 조회",
            description =
                    "사이즈·용량·사용기한 등 카테고리별 추가 항목(번개장터 등록 화면 기준). 상품 등록·수정 요청의 categoryOptions로 항목마다 값 하나를 보내며, 안전한 기본값이 없는 required 항목이 빠지면 등록·수정이 400으로 거절된다. 추가 항목이 없는 카테고리는 빈 목록.")
    @GetMapping("/{categoryId}/options")
    public ResponseEntity<ApiResponse<List<CategoryOptionGroupResponse>>> getOptions(@PathVariable Long categoryId) {
        return ResponseEntity.ok(ApiResponse.success(categoryOptionService.getOptions(categoryId)));
    }
}
