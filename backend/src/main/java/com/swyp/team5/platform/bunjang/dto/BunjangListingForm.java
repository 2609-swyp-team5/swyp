package com.swyp.team5.platform.bunjang.dto;

import java.util.List;

import com.swyp.team5.category.entity.CategoryOptionType;

/**
 * 번개장터 판매 등록 폼에 입력할 값. 우리 상품 정보를 번개장터 화면 기준 값(카테고리 이름 경로, 상태 라벨
 * 등)으로 변환해 둔 것이다.
 *
 * @param categoryPath 대분류부터 선택 순서대로 나열한 카테고리 이름(우리 카테고리가 번개장터 메뉴 기준이라 이름이 같다)
 * @param conditionLabel 번개장터 상품 상태 라벨(예: "사용감 없음")
 * @param directTradeLocation 직거래 희망 장소(직거래가 아니거나 미입력이면 null)
 * @param imageUrls 업로드할 이미지 URL(대표 이미지부터 순서대로)
 * @param categoryOptions 카테고리별 추가 항목(사이즈·사용기한 등, 없으면 빈 목록)
 */
public record BunjangListingForm(
        String title,
        long price,
        String description,
        List<String> categoryPath,
        String conditionLabel,
        List<String> tags,
        boolean directTrade,
        String directTradeLocation,
        boolean shippingFeeIncluded,
        List<String> imageUrls,
        List<Option> categoryOptions) {

    /**
     * 카테고리별 추가 항목 하나의 화면 입력값.
     *
     * @param groupName 항목 이름(예: "사이즈")
     * @param title 항목 선택 버튼·안내 문구(예: "사이즈를 선택해 주세요")
     * @param childName 세부 분류 이름(예: "공용 사이즈", 없으면 빈 문자열 — 같은 값이 여러 분류에 있을 때 구분)
     * @param value 고를 값 이름 또는 입력할 값(예: "M", "20301231")
     */
    public record Option(String groupName, String title, String childName, CategoryOptionType type, String value) {}
}
