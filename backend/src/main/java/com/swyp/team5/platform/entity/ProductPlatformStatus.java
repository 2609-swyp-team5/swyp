package com.swyp.team5.platform.entity;

/** 상품의 외부 플랫폼(번개장터 등) 게시 상태 */
public enum ProductPlatformStatus {
    /** 등록 진행 중(우리 서버가 대신 등록하는 경우에만 거침, 직접 등록한 매물 연동은 즉시 POSTED로 생성됨) */
    POSTING,
    /** 게시됨(정상 판매중) */
    POSTED,
    /** 등록 실패 */
    FAILED,
    /** 삭제/내려감 */
    REMOVED
}
