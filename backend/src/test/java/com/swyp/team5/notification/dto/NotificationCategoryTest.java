package com.swyp.team5.notification.dto;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.EnumSet;
import java.util.Map;
import java.util.Set;

import com.swyp.team5.notification.entity.NotificationType;
import org.junit.jupiter.api.Test;

class NotificationCategoryTest {

    // 모든 알림 종류가 정확히 한 탭에 속해야 탭별 건수 합이 전체 건수와 같다
    @Test
    void everyTypeBelongsToExactlyOneCategory() {
        Set<NotificationType> all = NotificationCategory.typesOf(EnumSet.allOf(NotificationCategory.class));
        assertThat(all).containsExactlyInAnyOrder(NotificationType.values());
        for (NotificationType type : NotificationType.values()) {
            assertThat(NotificationCategory.of(type)).isNotNull();
        }
    }

    // 종류별 건수를 탭별로 합치고 없는 탭은 0
    @Test
    void toCategoryCountsSumsTypesAndFillsZero() {
        Map<String, Long> counts = NotificationCategory.toCategoryCounts(
                Map.of(NotificationType.SELL, 2L, NotificationType.HOLD, 1L, NotificationType.BUY_PRICE_CHANGE, 4L));

        assertThat(counts)
                .containsExactly(
                        Map.entry("SELL", 3L),
                        Map.entry("BUY", 0L),
                        Map.entry("PRICE", 4L),
                        Map.entry("PLATFORM", 0L),
                        Map.entry("NOTICE", 0L));
    }
}
