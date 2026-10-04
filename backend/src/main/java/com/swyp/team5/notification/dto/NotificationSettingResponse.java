package com.swyp.team5.notification.dto;

import com.swyp.team5.notification.entity.NotificationSetting;

/** 본인 알림 수신 설정. 설정을 바꾼 적이 없으면 기본값으로 내려준다. */
public record NotificationSettingResponse(
        boolean recommendationEnabled, // AI 추천 타이밍 알림(기본 true) — 끄면 추천 전환 알림(SELL/HOLD/BUY/WAIT)을 만들지 않음
        boolean priceChangeEnabled, // 시세 변동 알림(기본 true) — 알림 기능 추가 전까지 저장만
        boolean targetPriceEnabled, // 목표가 도달 알림(기본 true) — 끄면 목표가 도달 알림을 만들지 않음
        boolean platformExpiryEnabled, // 플랫폼 연동 만료 알림(기본 true) — 알림 기능 추가 전까지 저장만
        boolean marketingEnabled) { // 마케팅·이벤트 알림(기본 false) — 저장만

    public static NotificationSettingResponse from(NotificationSetting setting) {
        return new NotificationSettingResponse(
                setting.isRecommendationEnabled(),
                setting.isPriceChangeEnabled(),
                setting.isTargetPriceEnabled(),
                setting.isPlatformExpiryEnabled(),
                setting.isMarketingEnabled());
    }
}
