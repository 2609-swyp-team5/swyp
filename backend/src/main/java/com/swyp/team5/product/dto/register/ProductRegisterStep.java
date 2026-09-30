package com.swyp.team5.product.dto.register;

/**
 * 단계별 스트리밍 등록·수정(SSE)의 처리 단계. 방식(직접 등록/AI 등록/수정)마다 쓰는 단계와 순서는 {@code ProductRegisterStreamService}의
 * 단계 목록이 정하며, 이벤트의 index/total도 그 목록 기준이다.
 */
public enum ProductRegisterStep {
    IMAGE_UPLOAD, // 상품 이미지를 스토리지에 업로드
    IMAGE_ANALYSIS, // AI(Gemini, 실패 시 GPT) 사진 분석
    PRODUCT_SAVE // 상품 저장(+ 비교 매물 평균가 계산)
}
