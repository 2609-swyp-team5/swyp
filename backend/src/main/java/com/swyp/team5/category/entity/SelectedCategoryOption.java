package com.swyp.team5.category.entity;

/**
 * 상품에 입력된 카테고리별 추가 항목 하나({@code products.category_options} JSON 배열의 원소). 번개장터에 게시할 때 화면에서 그대로
 * 고를 수 있도록 선택 당시의 항목·값 이름을 함께 저장한다(서버가 옵션 정의로 검증해 채운 값).
 *
 * @param groupId 항목 ID(예: "100" — 사이즈)
 * @param groupName 항목 이름(예: "사이즈")
 * @param childName 세부 분류 이름(예: "공용 사이즈", 없으면 빈 문자열)
 * @param type 입력 방식
 * @param valueId 선택한 값 ID(직접 입력 항목은 입력칸 ID)
 * @param value 선택한 값 이름 또는 직접 입력한 값(예: "M", "20301231")
 */
public record SelectedCategoryOption(
        String groupId, String groupName, String childName, CategoryOptionType type, long valueId, String value) {}
