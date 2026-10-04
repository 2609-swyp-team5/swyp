import { api } from "@/common/lib/api/client";
import type { ApiResponse } from "@/common/lib/api/types";

import type { NotificationPage, NotificationSettings } from "../schemas/notificationSchema";

const getNotifications = (params: { cursor?: string; size: number }, signal?: AbortSignal) =>
    api.get<ApiResponse<NotificationPage>>("/notifications", { params, signal });

const markRead = (notificationId: number) =>
    api.patch<ApiResponse<{ notificationId: number; isRead: boolean }>>(
        `/notifications/${notificationId}/read`,
    );

const getSettings = (signal?: AbortSignal) =>
    api.get<ApiResponse<NotificationSettings>>("/notifications/settings", { signal });

const updateSettings = (settings: Partial<NotificationSettings>) =>
    api.patch<ApiResponse<NotificationSettings>>("/notifications/settings", settings);

export const notificationApi = { getNotifications, markRead, getSettings, updateSettings };
