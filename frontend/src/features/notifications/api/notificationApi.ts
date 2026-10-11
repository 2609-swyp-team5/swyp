import { api } from "@/common/lib/api/client";
import type { ApiResponse } from "@/common/lib/api/types";

import type {
    NotificationCategoryParam,
    NotificationPage,
    NotificationSettings,
    NotificationUnreadCount,
} from "../schemas/notificationSchema";

const getNotifications = (
    params: { category?: NotificationCategoryParam; cursor?: string; size: number },
    signal?: AbortSignal,
) => api.get<ApiResponse<NotificationPage>>("/notifications", { params, signal });

const getUnreadCount = (signal?: AbortSignal) =>
    api.get<ApiResponse<NotificationUnreadCount>>("/notifications/unread", { signal });

const markRead = (notificationId: number) =>
    api.patch<ApiResponse<{ notificationId: number; isRead: boolean }>>(
        `/notifications/${notificationId}/read`,
    );

const deleteNotification = (notificationId: number) =>
    api.delete<ApiResponse<null>>(`/notifications/${notificationId}`);

const getSettings = (signal?: AbortSignal) =>
    api.get<ApiResponse<NotificationSettings>>("/notifications/settings", { signal });

const updateSettings = (settings: Partial<NotificationSettings>) =>
    api.patch<ApiResponse<NotificationSettings>>("/notifications/settings", settings);

export const notificationApi = {
    getNotifications,
    getUnreadCount,
    markRead,
    deleteNotification,
    getSettings,
    updateSettings,
};
