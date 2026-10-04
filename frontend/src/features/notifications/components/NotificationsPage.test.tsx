import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, expect, it, vi } from "vitest";

import { NotificationsPage } from "./NotificationsPage";

const { getNotifications, markRead } = vi.hoisted(() => ({
    getNotifications: vi.fn(),
    markRead: vi.fn(),
}));

vi.mock("../api/notificationApi", () => ({
    notificationApi: { getNotifications, markRead },
}));

vi.mock("@/features/auth/store/authStore", () => ({
    useAuthStore: (selector: (state: { isInitialized: boolean; isLoggedIn: boolean }) => unknown) =>
        selector({ isInitialized: true, isLoggedIn: true }),
}));

function renderPage() {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    return render(
        <QueryClientProvider client={client}>
            <NotificationsPage />
        </QueryClientProvider>,
    );
}

beforeEach(() => {
    getNotifications.mockReset();
    markRead.mockReset();
    markRead.mockResolvedValue({
        data: { success: true, message: "", data: { notificationId: 1, isRead: true } },
    });
});

it("서버 알림을 보여주고 종류별로 거르며 읽음 처리한다", async () => {
    getNotifications.mockResolvedValue({
        data: {
            success: true,
            message: "",
            data: {
                content: [
                    {
                        notificationId: 2,
                        type: "SELL",
                        title: "아이폰 13, 지금 판매를 추천해요",
                        message: "시세가 내려가기 전에 파는 게 좋아요.",
                        productId: 10,
                        listingId: null,
                        isRead: false,
                        createdAt: new Date().toISOString(),
                    },
                    {
                        notificationId: 1,
                        type: "NOTICE",
                        title: "서비스 점검 안내",
                        message: "10월 10일 새벽 점검이 있어요.",
                        productId: null,
                        listingId: null,
                        isRead: true,
                        createdAt: "2026-09-01T09:00:00",
                    },
                ],
                nextCursor: null,
                hasNext: false,
                totalCount: 2,
            },
        },
    });
    const user = userEvent.setup();

    renderPage();

    expect(await screen.findByText("아이폰 13, 지금 판매를 추천해요")).toBeInTheDocument();
    expect(screen.getByText("서비스 점검 안내")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "판매 분석 보기" })).toHaveAttribute(
        "href",
        "/sell/manage?selected=10",
    );

    await user.click(screen.getByRole("button", { name: /공지/ }));
    expect(screen.queryByText("아이폰 13, 지금 판매를 추천해요")).not.toBeInTheDocument();
    expect(screen.getByText("서비스 점검 안내")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /전체/ }));
    await user.click(screen.getByRole("button", { name: "읽음 처리" }));
    await waitFor(() => expect(markRead).toHaveBeenCalledWith(2));
});

it("알림이 없으면 빈 상태를 보여준다", async () => {
    getNotifications.mockResolvedValue({
        data: {
            success: true,
            message: "",
            data: { content: [], nextCursor: null, hasNext: false, totalCount: 0 },
        },
    });

    renderPage();

    expect(await screen.findByText("아직 받은 알림이 없습니다.")).toBeInTheDocument();
});
