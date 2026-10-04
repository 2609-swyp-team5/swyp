"use client";

import { useQuery } from "@tanstack/react-query";

import { useAuthStore } from "@/features/auth/store/authStore";

import { notificationApi } from "../../api/notificationApi";
import { notificationSettingsSchema } from "../../schemas/notificationSchema";

export const notificationSettingsQueryKey = ["notification-settings"] as const;

export function useNotificationSettingsQuery() {
    const isInitialized = useAuthStore((state) => state.isInitialized);
    const isLoggedIn = useAuthStore((state) => state.isLoggedIn);

    return useQuery({
        queryKey: notificationSettingsQueryKey,
        queryFn: async ({ signal }) => {
            const { data } = await notificationApi.getSettings(signal);
            if (!data.success) throw new Error(data.message);
            return notificationSettingsSchema.parse(data.data);
        },
        enabled: isInitialized && isLoggedIn,
        retry: false,
    });
}
