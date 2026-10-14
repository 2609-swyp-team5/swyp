"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { notificationApi } from "../../api/notificationApi";
import type { NotificationCategoryParam } from "../../schemas/notificationSchema";
import { notificationsQueryKey } from "../queries/useNotificationsQuery";
import { notificationUnreadCountQueryKey } from "../queries/useUnreadNotificationCountQuery";

/** 전체 또는 탭별 알림 일괄 삭제. 지운 범위가 넓어 낙관적 갱신 대신 성공 후 목록·안 읽은 수를 다시 불러온다. */
export function useDeleteAllNotificationsMutation() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (category?: NotificationCategoryParam) => {
            const { data } = await notificationApi.deleteAllNotifications(category);
            if (!data.success) throw new Error(data.message);
            return data.data;
        },
        onSettled: () =>
            Promise.all([
                queryClient.invalidateQueries({ queryKey: notificationsQueryKey }),
                queryClient.invalidateQueries({ queryKey: notificationUnreadCountQueryKey }),
            ]),
    });
}
