"use client";

import { useInfiniteQuery } from "@tanstack/react-query";

import { useAuthStore } from "@/features/auth/store/authStore";

import { notificationApi } from "../../api/notificationApi";
import { notificationPageSchema } from "../../schemas/notificationSchema";

export const notificationsQueryKey = ["notifications"] as const;

const pageSize = 20;

export function useNotificationsQuery() {
    const isInitialized = useAuthStore((state) => state.isInitialized);
    const isLoggedIn = useAuthStore((state) => state.isLoggedIn);

    return useInfiniteQuery({
        queryKey: notificationsQueryKey,
        initialPageParam: undefined as string | undefined,
        queryFn: async ({ pageParam, signal }) => {
            const { data } = await notificationApi.getNotifications(
                { cursor: pageParam, size: pageSize },
                signal,
            );
            if (!data.success) throw new Error(data.message);
            return notificationPageSchema.parse(data.data);
        },
        getNextPageParam: (lastPage) =>
            lastPage.hasNext ? (lastPage.nextCursor ?? undefined) : undefined,
        enabled: isInitialized && isLoggedIn,
        retry: false,
    });
}
