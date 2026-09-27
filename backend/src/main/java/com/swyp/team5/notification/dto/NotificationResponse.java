package com.swyp.team5.notification.dto;

import java.time.LocalDateTime;

import com.swyp.team5.notification.entity.Notification;
import com.swyp.team5.notification.entity.NotificationType;

public record NotificationResponse(
        Long notificationId,
        NotificationType type,
        String title,
        String message,
        Long productId, // 상품과 무관한 알림이면 null
        boolean isRead,
        LocalDateTime createdAt) {

    public static NotificationResponse from(Notification notification) {
        return new NotificationResponse(
                notification.getId(),
                notification.getType(),
                notification.getTitle(),
                notification.getMessage(),
                notification.getProduct() != null ? notification.getProduct().getId() : null,
                notification.isRead(),
                notification.getCreatedAt());
    }
}
