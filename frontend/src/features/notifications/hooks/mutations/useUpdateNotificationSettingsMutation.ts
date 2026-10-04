"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { notificationApi } from "../../api/notificationApi";
import {
    type NotificationSettings,
    notificationSettingsSchema,
} from "../../schemas/notificationSchema";
import { notificationSettingsQueryKey } from "../queries/useNotificationSettingsQuery";

export function useUpdateNotificationSettingsMutation() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (settings: Partial<NotificationSettings>) => {
            const { data } = await notificationApi.updateSettings(settings);
            if (!data.success) throw new Error(data.message);
            return notificationSettingsSchema.parse(data.data);
        },
        onSuccess: (settings) => {
            queryClient.setQueryData(notificationSettingsQueryKey, settings);
        },
    });
}
