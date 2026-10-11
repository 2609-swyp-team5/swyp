"use client";

import {
    useMutation,
    useQueryClient,
    type InfiniteData,
    type QueryKey,
} from "@tanstack/react-query";

import { notificationApi } from "../../api/notificationApi";
import type { NotificationPage, NotificationUnreadCount } from "../../schemas/notificationSchema";
import { getNotificationCategory, toCategoryParam } from "../../utils/notificationDisplay";
import { notificationsQueryKey } from "../queries/useNotificationsQuery";
import { notificationUnreadCountQueryKey } from "../queries/useUnreadNotificationCountQuery";

type NotificationsQueryData = InfiniteData<NotificationPage, string | undefined>;
type NotificationsQuerySnapshot = Array<[QueryKey, NotificationsQueryData | undefined]>;

type DeleteNotificationContext = {
    notifications: NotificationsQuerySnapshot;
    unreadCount: NotificationUnreadCount | undefined;
};

function getQueryCategory(queryKey: QueryKey) {
    const category = queryKey[notificationsQueryKey.length];
    return typeof category === "string" ? category : undefined;
}

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

            const previousNotifications = queryClient.getQueriesData<NotificationsQueryData>({
                queryKey: notificationsQueryKey,
            });
            const previousUnreadCount = queryClient.getQueryData<NotificationUnreadCount>(
                notificationUnreadCountQueryKey,
            );
            const deletedNotification = previousNotifications
                .flatMap(([, data]) => data?.pages.flatMap((page) => page.content) ?? [])
                .find((notification) => notification.notificationId === notificationId);
            const deletedCategory = deletedNotification
                ? toCategoryParam(getNotificationCategory(deletedNotification.type))
                : undefined;

            previousNotifications.forEach(([queryKey, current]) => {
                if (!current) return;

                const queryCategory = getQueryCategory(queryKey);
                const affectsFilteredTotalCount =
                    deletedCategory !== undefined &&
                    (queryCategory === "ALL" || queryCategory === deletedCategory);

                queryClient.setQueryData<NotificationsQueryData>(queryKey, {
                    ...current,
                    pages: current.pages.map((page, index) => ({
                        ...page,
                        content: page.content.filter(
                            (notification) => notification.notificationId !== notificationId,
                        ),
                        totalCount:
                            index === 0 && affectsFilteredTotalCount && page.totalCount !== null
                                ? Math.max(0, page.totalCount - 1)
                                : page.totalCount,
                        statusCounts:
                            deletedCategory && page.statusCounts
                                ? {
                                      ...page.statusCounts,
                                      [deletedCategory]: Math.max(
                                          0,
                                          (page.statusCounts[deletedCategory] ?? 0) - 1,
                                      ),
                                  }
                                : page.statusCounts,
                    })),
                });
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
            context.notifications.forEach(([queryKey, data]) => {
                queryClient.setQueryData(queryKey, data);
            });
            queryClient.setQueryData(notificationUnreadCountQueryKey, context.unreadCount);
        },
        onSettled: () => {
            void queryClient.invalidateQueries({ queryKey: notificationsQueryKey });
            void queryClient.invalidateQueries({ queryKey: notificationUnreadCountQueryKey });
        },
    });
}
