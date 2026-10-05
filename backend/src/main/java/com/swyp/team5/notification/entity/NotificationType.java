package com.swyp.team5.notification.entity;

/**
 * 알림 종류. SELL/HOLD(판매자 대상)와 BUY/WAIT(관심 등록 회원 대상)는 시세 분석 추천 전환 알림, NOTICE는 상품과
 * 무관한 공지/시스템 알림, TARGET_PRICE는 관심상품 가격이 목표가 이하가 됐을 때의 알림, PLATFORM_EXPIRED는 외부
 * 플랫폼(번개장터 등) 연동 세션이 만료됐을 때의 알림(상품과 무관).
 */
public enum NotificationType {
    SELL,
    HOLD,
    BUY,
    WAIT,
    NOTICE,
    TARGET_PRICE,
    PLATFORM_EXPIRED
}
