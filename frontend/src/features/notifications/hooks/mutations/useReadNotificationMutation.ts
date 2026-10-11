"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { notificationApi } from "../../api/notificationApi";
import { notificationsQueryKey } from "../queries/useNotificationsQuery";
import { notificationUnreadCountQueryKey } from "../queries/useUnreadNotificationCountQuery";

export function useReadNotificationMutation() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (notificationId: number) => {
            const { data } = await notificationApi.markRead(notificationId);
            if (!data.success) throw new Error(data.message);
        },
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: notificationsQueryKey });
            void queryClient.invalidateQueries({ queryKey: notificationUnreadCountQueryKey });
        },
    });
}
