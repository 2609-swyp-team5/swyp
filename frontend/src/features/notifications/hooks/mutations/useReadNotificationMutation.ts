"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { notificationApi } from "../../api/notificationApi";
import { notificationsQueryKey } from "../queries/useNotificationsQuery";

export function useReadNotificationMutation() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (notificationId: number) => {
            const { data } = await notificationApi.markRead(notificationId);
            if (!data.success) throw new Error(data.message);
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: notificationsQueryKey }),
    });
}
