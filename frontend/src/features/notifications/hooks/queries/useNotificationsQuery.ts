"use client";

import { keepPreviousData, useInfiniteQuery } from "@tanstack/react-query";

import { useAuthStore } from "@/features/auth/store/authStore";

import { notificationApi } from "../../api/notificationApi";
import {
    type NotificationCategoryParam,
    notificationPageSchema,
} from "../../schemas/notificationSchema";

export const notificationsQueryKey = ["notifications"] as const;

const pageSize = 20;

/** 탭(`category`)마다 따로 캐시한다 — 무효화는 `notificationsQueryKey` 접두어로 전체 탭에 걸린다. */
export function useNotificationsQuery(category?: NotificationCategoryParam) {
    const isInitialized = useAuthStore((state) => state.isInitialized);
    const isLoggedIn = useAuthStore((state) => state.isLoggedIn);

    return useInfiniteQuery({
        queryKey: [...notificationsQueryKey, category ?? "ALL"],
        initialPageParam: undefined as string | undefined,
        queryFn: async ({ pageParam, signal }) => {
            const { data } = await notificationApi.getNotifications(
                { category, cursor: pageParam, size: pageSize },
                signal,
            );
            if (!data.success) throw new Error(data.message);
            return notificationPageSchema.parse(data.data);
        },
        getNextPageParam: (lastPage) =>
            lastPage.hasNext ? (lastPage.nextCursor ?? undefined) : undefined,
        // 탭 전환 중 탭 숫자가 깜빡이지 않게 이전 탭 응답을 placeholder로 둔다
        placeholderData: keepPreviousData,
        enabled: isInitialized && isLoggedIn,
        retry: false,
    });
}
