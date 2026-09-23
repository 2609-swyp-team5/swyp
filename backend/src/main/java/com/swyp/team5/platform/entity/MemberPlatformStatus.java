package com.swyp.team5.platform.entity;

/** 회원-외부 플랫폼(번개장터 등) 세션 연동 상태 */
public enum MemberPlatformStatus {
    /** 세션 연동됨(정상 사용 가능) */
    CONNECTED,
    /** 세션이 만료됨(재연동 필요) */
    EXPIRED,
    /** 연동 해제됨(사용자가 직접 해제) */
    DISCONNECTED
}
