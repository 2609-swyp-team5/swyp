package com.swyp.team5.notification.error;

/** 존재하지 않거나 본인 알림이 아닌 경우(다른 회원 알림의 존재 여부를 드러내지 않도록 같은 404로 처리). */
public class NotificationNotFoundException extends RuntimeException {

    public NotificationNotFoundException() {
        super("존재하지 않는 알림입니다.");
    }
}
