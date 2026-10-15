package com.swyp.team5.category.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/**
 * 상품 등록·수정 요청의 카테고리별 추가 항목 입력 하나. 항목마다 하나만 고른다.
 *
 * @param groupId 항목 ID({@code GET /categories/{id}/options}의 {@code groupId})
 * @param valueId 고른 값 ID(직접 입력 항목은 입력칸의 {@code valueId})
 * @param text 직접 입력 값(규격 등 직접 입력·날짜 입력 항목만, 날짜는 년월일 8자리)
 */
public record CategoryOptionSelection(@NotBlank String groupId, @NotNull Long valueId, @Size(max = 50) String text) {}
