package com.swyp.team5.notification.dto;

import java.util.Arrays;
import java.util.Collection;
import java.util.EnumSet;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

import com.swyp.team5.notification.entity.NotificationType;

/**
 * 알림 화면 탭 분류. 알림 종류({@link NotificationType}) 여러 개를 탭 하나로 묶는다 — 판매추천(SELL/HOLD/SELL_TARGET_PRICE),
 * 구매추천(BUY/WAIT/TARGET_PRICE), 시세변동(SELL_PRICE_CHANGE/BUY_PRICE_CHANGE), 연동(PLATFORM_EXPIRED), 공지(NOTICE).
 */
public enum NotificationCategory {
    SELL(EnumSet.of(NotificationType.SELL, NotificationType.HOLD, NotificationType.SELL_TARGET_PRICE)),
    BUY(EnumSet.of(NotificationType.BUY, NotificationType.WAIT, NotificationType.TARGET_PRICE)),
    PRICE(EnumSet.of(NotificationType.SELL_PRICE_CHANGE, NotificationType.BUY_PRICE_CHANGE)),
    PLATFORM(EnumSet.of(NotificationType.PLATFORM_EXPIRED)),
    NOTICE(EnumSet.of(NotificationType.NOTICE));

    private final Set<NotificationType> types;

    NotificationCategory(Set<NotificationType> types) {
        this.types = types;
    }

    public static NotificationCategory of(NotificationType type) {
        return Arrays.stream(values())
                .filter(category -> category.types.contains(type))
                .findFirst()
                .orElseThrow(() -> new IllegalStateException("탭 분류가 없는 알림 종류: " + type));
    }

    /** 주어진 탭들에 속한 알림 종류 전체. */
    public static Set<NotificationType> typesOf(Collection<NotificationCategory> categories) {
        return categories.stream()
                .flatMap(category -> category.types.stream())
                .collect(Collectors.toCollection(() -> EnumSet.noneOf(NotificationType.class)));
    }

    /** 알림 종류별 건수를 탭 선언 순서의 탭별 건수로 합치고, 없는 탭은 0으로 채운다(목록 응답 {@code statusCounts}용). */
    public static Map<String, Long> toCategoryCounts(Map<NotificationType, Long> countsByType) {
        Map<String, Long> counts = new LinkedHashMap<>();
        for (NotificationCategory category : values()) {
            counts.put(category.name(), 0L);
        }
        countsByType.forEach((type, count) -> counts.merge(of(type).name(), count, Long::sum));
        return counts;
    }
}
