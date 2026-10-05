import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

import { setPushEnabled } from "../lib/pushPreference";
import { NotificationToaster } from "./NotificationToaster";

const { getNotifications } = vi.hoisted(() => ({ getNotifications: vi.fn() }));

vi.mock("../api/notificationApi", () => ({
    notificationApi: { getNotifications, markRead: vi.fn() },
}));

vi.mock("@/features/auth/store/authStore", () => ({
    useAuthStore: (selector: (state: { isInitialized: boolean; isLoggedIn: boolean }) => unknown) =>
        selector({ isInitialized: true, isLoggedIn: true }),
}));

const notification = (notificationId: number, title: string) => ({
    notificationId,
    type: "BUY",
    title,
    message: "평균 시세보다 싸요.",
    productId: null,
    listingId: 77,
    isRead: false,
    createdAt: new Date().toISOString(),
});

const page = (content: unknown[]) => ({
    data: {
        success: true,
        message: "",
        data: { content, nextCursor: null, hasNext: false, totalCount: content.length },
    },
});

beforeEach(() => {
    getNotifications.mockReset();
    act(() => setPushEnabled(true));
});

afterEach(() => {
    vi.useRealTimers();
});

it("처음 확인한 뒤 새로 도착한 안 읽은 알림만 토스트로 띄운다", async () => {
    getNotifications
        .mockResolvedValueOnce(page([notification(1, "이미 있던 알림")]))
        .mockResolvedValueOnce(
            page([notification(2, "새 구매 추천"), notification(1, "이미 있던 알림")]),
        );
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
        <QueryClientProvider client={client}>
            <NotificationToaster />
        </QueryClientProvider>,
    );
    await vi.waitFor(() => expect(client.getQueryData(["notification-toaster"])).toBe(1));
    expect(screen.queryByText("이미 있던 알림")).not.toBeInTheDocument();

    await act(() => client.refetchQueries({ queryKey: ["notification-toaster"] }));

    expect(await screen.findByText("새 구매 추천")).toBeInTheDocument();
    expect(screen.queryByText("이미 있던 알림")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "상품 분석 보기" })).toHaveAttribute(
        "href",
        "/search/77",
    );
});

it("푸시 알림을 끄면 알림을 확인하지 않는다", async () => {
    act(() => setPushEnabled(false));
    const client = new QueryClient();
    render(
        <QueryClientProvider client={client}>
            <NotificationToaster />
        </QueryClientProvider>,
    );

    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(getNotifications).not.toHaveBeenCalled();
});

it("토스트는 8초 뒤 닫히고 마우스를 올린 동안은 닫히지 않는다", async () => {
    getNotifications
        .mockResolvedValueOnce(page([]))
        .mockResolvedValueOnce(page([notification(3, "목표가 도달")]));
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
        <QueryClientProvider client={client}>
            <NotificationToaster />
        </QueryClientProvider>,
    );
    await vi.waitFor(() => expect(client.getQueryData(["notification-toaster"])).toBe(0));
    await act(() => client.refetchQueries({ queryKey: ["notification-toaster"] }));
    const title = await screen.findByText("목표가 도달");
    const toast = title.closest("div.pointer-events-auto")!;

    // 마우스를 올리면 시간이 멈춘다
    fireEvent.mouseEnter(toast);
    vi.useFakeTimers();
    act(() => vi.advanceTimersByTime(20_000));
    expect(screen.getByText("목표가 도달")).toBeInTheDocument();

    // 마우스를 떼면 남은 시간(약 8초)부터 다시 센다
    fireEvent.mouseLeave(toast);
    act(() => vi.advanceTimersByTime(7_000));
    expect(screen.getByText("목표가 도달")).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(1_500));
    expect(screen.queryByText("목표가 도달")).not.toBeInTheDocument();
});
