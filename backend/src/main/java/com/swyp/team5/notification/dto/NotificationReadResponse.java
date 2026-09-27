package com.swyp.team5.notification.dto;

import com.swyp.team5.notification.entity.Notification;

public record NotificationReadResponse(Long notificationId, boolean isRead) {

    public static NotificationReadResponse from(Notification notification) {
        return new NotificationReadResponse(notification.getId(), notification.isRead());
    }
}
