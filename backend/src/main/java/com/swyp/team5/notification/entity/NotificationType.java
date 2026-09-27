package com.swyp.team5.notification.entity;

/** 알림 종류. SELL/BUY는 시세 분석 추천 전환 알림, HOLD는 예약값, NOTICE는 상품과 무관한 공지/시스템 알림. */
public enum NotificationType {
    SELL,
    HOLD,
    BUY,
    NOTICE
}
