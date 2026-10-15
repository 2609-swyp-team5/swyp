package com.swyp.team5.category.entity;

/** 카테고리별 추가 항목의 입력 방식(번개장터 등록 화면 기준). */
public enum CategoryOptionType {
    SINGLE_SELECT, // 값 목록에서 하나 고르기(예: 사이즈 M)
    SINGLE_ROUND, // 단독 선택지 하나(예: "기타 (상품설명에 작성)", "사용기한 표시 없음")
    TEXT_FIELD, // 직접 입력(예: 규격 500×700×300mm)
    DATE_TEXT_FIELD; // 년월일 8자리 입력(예: 사용기한 20301231)

    public boolean needsText() {
        return this == TEXT_FIELD || this == DATE_TEXT_FIELD;
    }
}
