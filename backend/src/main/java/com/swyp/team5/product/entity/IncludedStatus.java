package com.swyp.team5.product.entity;

/**
 * 상품 구매 당시 구성품의 현재 보유 상태.
 *
 * <p>구성품 상세 목록을 별도로 입력하지 않는 등록 화면에서도 직접 등록·AI 등록·수정·외부 플랫폼 게시가 같은
 * 값을 사용할 수 있도록 공통 enum으로 둔다.</p>
 */
public enum IncludedStatus {
    NONE,
    PARTIAL,
    ALL
}
