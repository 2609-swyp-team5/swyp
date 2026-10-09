"use client";

import { useMutation, useQueryClient, type InfiniteData } from "@tanstack/react-query";

import { notificationApi } from "../../api/notificationApi";
import type { NotificationPage, NotificationUnreadCount } from "../../schemas/notificationSchema";
import { notificationsQueryKey } from "../queries/useNotificationsQuery";
import { notificationUnreadCountQueryKey } from "../queries/useUnreadNotificationCountQuery";

type NotificationsQueryData = InfiniteData<NotificationPage, string | undefined>;

type DeleteNotificationContext = {
    notifications: NotificationsQueryData | undefined;
    unreadCount: NotificationUnreadCount | undefined;
};

export function useDeleteNotificationMutation() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (notificationId: number) => {
            const { data } = await notificationApi.deleteNotification(notificationId);
            if (!data.success) throw new Error(data.message);
        },
        onMutate: async (notificationId): Promise<DeleteNotificationContext> => {
            await Promise.all([
                queryClient.cancelQueries({ queryKey: notificationsQueryKey }),
                queryClient.cancelQueries({ queryKey: notificationUnreadCountQueryKey }),
            ]);

            const previousNotifications =
                queryClient.getQueryData<NotificationsQueryData>(notificationsQueryKey);
            const previousUnreadCount = queryClient.getQueryData<NotificationUnreadCount>(
                notificationUnreadCountQueryKey,
            );
            const deletedNotification = previousNotifications?.pages
                .flatMap((page) => page.content)
                .find((notification) => notification.notificationId === notificationId);

            queryClient.setQueryData<NotificationsQueryData>(notificationsQueryKey, (current) => {
                if (!current) return current;

                return {
                    ...current,
                    pages: current.pages.map((page, index) => ({
                        ...page,
                        content: page.content.filter(
                            (notification) => notification.notificationId !== notificationId,
                        ),
                        totalCount:
                            index === 0 && page.totalCount !== null
                                ? Math.max(0, page.totalCount - 1)
                                : page.totalCount,
                    })),
                };
            });

            if (deletedNotification && !deletedNotification.isRead) {
                queryClient.setQueryData<NotificationUnreadCount>(
                    notificationUnreadCountQueryKey,
                    (current) => (current ? { count: Math.max(0, current.count - 1) } : current),
                );
            }

            return {
                notifications: previousNotifications,
                unreadCount: previousUnreadCount,
            };
        },
        onError: (_error, _notificationId, context) => {
            if (!context) return;
            queryClient.setQueryData(notificationsQueryKey, context.notifications);
            queryClient.setQueryData(notificationUnreadCountQueryKey, context.unreadCount);
        },
        onSettled: () => {
            void queryClient.invalidateQueries({ queryKey: notificationsQueryKey });
            void queryClient.invalidateQueries({ queryKey: notificationUnreadCountQueryKey });
        },
    });
}
