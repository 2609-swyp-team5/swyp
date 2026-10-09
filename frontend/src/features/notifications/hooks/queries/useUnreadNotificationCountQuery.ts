"use client";

import { useQuery } from "@tanstack/react-query";

import { useAuthStore } from "@/features/auth/store/authStore";

import { notificationApi } from "../../api/notificationApi";
import { notificationUnreadCountSchema } from "../../schemas/notificationSchema";

export const notificationUnreadCountQueryKey = ["notification-unread-count"] as const;

export function useUnreadNotificationCountQuery() {
    const isInitialized = useAuthStore((state) => state.isInitialized);
    const isLoggedIn = useAuthStore((state) => state.isLoggedIn);

    return useQuery({
        queryKey: notificationUnreadCountQueryKey,
        queryFn: async ({ signal }) => {
            const { data } = await notificationApi.getUnreadCount(signal);
            if (!data.success) throw new Error(data.message);
            return notificationUnreadCountSchema.parse(data.data);
        },
        enabled: isInitialized && isLoggedIn,
        retry: false,
    });
}
