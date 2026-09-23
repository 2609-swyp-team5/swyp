package com.swyp.team5.platform.bunjang.dto;

import java.util.List;

/**
 * 번개장터 판매 등록 폼에 입력할 값. 우리 상품 정보를 번개장터 화면 기준 값(카테고리 이름 경로, 상태 라벨
 * 등)으로 변환해 둔 것이다.
 *
 * @param categoryPath 대분류부터 선택 순서대로 나열한 카테고리 이름(우리 카테고리가 번개장터 메뉴 기준이라 이름이 같다)
 * @param conditionLabel 번개장터 상품 상태 라벨(예: "사용감 없음")
 * @param directTradeLocation 직거래 희망 장소(직거래가 아니거나 미입력이면 null)
 * @param imageUrls 업로드할 이미지 URL(대표 이미지부터 순서대로)
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
        List<String> imageUrls) {}
