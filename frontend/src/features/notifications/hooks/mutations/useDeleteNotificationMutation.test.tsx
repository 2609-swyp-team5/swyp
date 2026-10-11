import type { ReactNode } from "react";

import { QueryClient, QueryClientProvider, type InfiniteData } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";

import type { NotificationPage } from "../../schemas/notificationSchema";
import { notificationsQueryKey } from "../queries/useNotificationsQuery";
import { useDeleteNotificationMutation } from "./useDeleteNotificationMutation";

const { deleteNotification } = vi.hoisted(() => ({ deleteNotification: vi.fn() }));

vi.mock("../../api/notificationApi", () => ({
    notificationApi: { deleteNotification },
}));

vi.mock("@/features/auth/store/authStore", () => ({
    useAuthStore: vi.fn(),
}));

type NotificationsQueryData = InfiniteData<NotificationPage, string | undefined>;

const notification = {
    notificationId: 7,
    type: "SELL" as const,
    title: "판매 추천",
    message: "상품을 확인해 보세요.",
    productId: 42,
    listingId: null,
    isRead: false,
    createdAt: "2026-10-11T00:00:00Z",
};

function createData(): NotificationsQueryData {
    return {
        pages: [
            {
                content: [notification],
                nextCursor: null,
                hasNext: false,
                totalCount: 1,
                statusCounts: { SELL: 1 },
            },
        ],
        pageParams: [undefined],
    };
}

function setup() {
    const client = new QueryClient({
        defaultOptions: { mutations: { retry: false, gcTime: 0 } },
    });
    const allKey = [...notificationsQueryKey, "ALL"] as const;
    const sellKey = [...notificationsQueryKey, "SELL"] as const;
    const buyKey = [...notificationsQueryKey, "BUY"] as const;
    client.setQueryData(allKey, createData());
    client.setQueryData(sellKey, createData());
    client.setQueryData(buyKey, {
        ...createData(),
        pages: [{ ...createData().pages[0], content: [], totalCount: 5 }],
    });

    const hook = renderHook(() => useDeleteNotificationMutation(), {
        wrapper: ({ children }: { children: ReactNode }) => (
            <QueryClientProvider client={client}>{children}</QueryClientProvider>
        ),
    });

    return { ...hook, client, allKey, sellKey, buyKey };
}

beforeEach(() => {
    deleteNotification.mockReset();
});

it("removes the notification from every loaded tab cache optimistically", async () => {
    deleteNotification.mockResolvedValue({
        data: { success: true, message: "", data: null },
    });
    const { result, client, allKey, sellKey, buyKey } = setup();

    act(() => result.current.mutate(7));

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(client.getQueryData<NotificationsQueryData>(allKey)?.pages[0].content).toEqual([]);
    expect(client.getQueryData<NotificationsQueryData>(sellKey)?.pages[0].content).toEqual([]);
    expect(client.getQueryData<NotificationsQueryData>(allKey)?.pages[0].totalCount).toBe(0);
    expect(client.getQueryData<NotificationsQueryData>(sellKey)?.pages[0].totalCount).toBe(0);
    expect(client.getQueryData<NotificationsQueryData>(buyKey)?.pages[0].content).toEqual([]);
    expect(client.getQueryData<NotificationsQueryData>(buyKey)?.pages[0].totalCount).toBe(5);
    expect(client.getQueryData<NotificationsQueryData>(allKey)?.pages[0].statusCounts).toEqual({
        SELL: 0,
    });
    expect(client.getQueryData<NotificationsQueryData>(sellKey)?.pages[0].statusCounts).toEqual({
        SELL: 0,
    });
    expect(client.getQueryData<NotificationsQueryData>(buyKey)?.pages[0].statusCounts).toEqual({
        SELL: 0,
    });
});

it("restores every tab cache when deletion fails", async () => {
    deleteNotification.mockRejectedValue(new Error("네트워크 오류"));
    const { result, client, allKey, sellKey, buyKey } = setup();

    act(() => result.current.mutate(7));

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(client.getQueryData<NotificationsQueryData>(allKey)?.pages[0].content).toEqual([
        notification,
    ]);
    expect(client.getQueryData<NotificationsQueryData>(sellKey)?.pages[0].content).toEqual([
        notification,
    ]);
    expect(client.getQueryData<NotificationsQueryData>(allKey)?.pages[0].totalCount).toBe(1);
    expect(client.getQueryData<NotificationsQueryData>(sellKey)?.pages[0].totalCount).toBe(1);
    expect(client.getQueryData<NotificationsQueryData>(buyKey)?.pages[0].totalCount).toBe(5);
    expect(client.getQueryData<NotificationsQueryData>(allKey)?.pages[0].statusCounts).toEqual({
        SELL: 1,
    });
});
