package com.swyp.team5.notification.dto;

/** 알림 수신 설정 변경 요청. 보낸 항목만 바꾸고, 생략하거나 {@code null}인 항목은 그대로 둔다. */
public record NotificationSettingUpdateRequest(
        Boolean recommendationEnabled,
        Boolean priceChangeEnabled,
        Boolean targetPriceEnabled,
        Boolean platformExpiryEnabled,
        Boolean marketingEnabled) {}
