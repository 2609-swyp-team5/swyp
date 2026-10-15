package com.swyp.team5.category.dto;

import java.util.List;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.swyp.team5.category.entity.CategoryOptionType;

/**
 * 카테고리별 추가 항목(사이즈·용량·사용기한 등) 하나. 번개장터 등록 화면의 옵션 정의를 수집해 둔 값이다
 * ({@code resources/bunjang/category-options.json}). 항목마다 세부 분류({@code children}) 중 한 곳에서 값 하나를 고른다.
 *
 * @param groupId 항목 ID(상품 등록·수정 요청의 {@code categoryOptions[].groupId})
 * @param name 항목 이름(예: "사이즈")
 * @param title 입력 안내 문구(예: "사이즈를 선택해 주세요")
 * @param required 필수 여부(안전한 기본값이 없는 필수 항목이 빠지면 등록·수정·번개장터 게시가 거절됨)
 * @param tooltip 항목 설명(없으면 생략)
 * @param guide 입력 예시 문구(없으면 생략)
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record CategoryOptionGroupResponse(
        String groupId,
        String name,
        String title,
        boolean required,
        String tooltip,
        List<String> guide,
        List<Child> children) {

    /**
     * @param name 세부 분류 이름(예: "공용 사이즈", 없으면 빈 문자열)
     * @param type 입력 방식
     */
    public record Child(String groupId, String name, CategoryOptionType type, List<Value> values) {}

    /**
     * @param valueId 값 ID(상품 등록·수정 요청의 {@code categoryOptions[].valueId})
     * @param value 값 이름(직접 입력 항목은 빈 문자열)
     * @param placeholder 입력칸 안내(직접 입력 항목만)
     * @param maxLength 최대 글자 수(직접 입력 항목만)
     */
    @JsonInclude(JsonInclude.Include.NON_NULL)
    public record Value(long valueId, String value, String placeholder, Integer maxLength) {}
}
