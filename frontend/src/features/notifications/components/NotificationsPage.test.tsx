import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, expect, it, vi } from "vitest";

import { NotificationsPage } from "./NotificationsPage";

const { getNotifications, markRead, deleteNotification } = vi.hoisted(() => ({
    getNotifications: vi.fn(),
    markRead: vi.fn(),
    deleteNotification: vi.fn(),
}));

vi.mock("../api/notificationApi", () => ({
    notificationApi: { getNotifications, markRead, deleteNotification },
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
    deleteNotification.mockReset();
    markRead.mockResolvedValue({
        data: { success: true, message: "", data: { notificationId: 1, isRead: true } },
    });
    deleteNotification.mockResolvedValue({ data: { success: true, message: "", data: null } });
});

const sellNotification = {
    notificationId: 2,
    type: "SELL",
    title: "아이폰 13, 지금 판매를 추천해요",
    message: "시세가 내려가기 전에 파는 게 좋아요.",
    productId: 10,
    listingId: null,
    isRead: false,
    createdAt: new Date().toISOString(),
};

const noticeNotification = {
    notificationId: 1,
    type: "NOTICE",
    title: "서비스 점검 안내",
    message: "10월 10일 새벽 점검이 있어요.",
    productId: null,
    listingId: null,
    isRead: true,
    createdAt: "2026-09-01T09:00:00",
};

// 불러온 목록 수와 다르게 서버 탭별 건수를 준다(탭 숫자는 서버 값을 그대로 써야 함)
const statusCounts = { SELL: 25, BUY: 0, PRICE: 3, PLATFORM: 0, NOTICE: 12 };

it("탭마다 서버에서 해당 알림만 받아 보여주고, 탭 숫자는 서버 건수를 쓰며 읽음 처리한다", async () => {
    getNotifications.mockImplementation(async ({ category }: { category?: string }) => {
        const content =
            category === "NOTICE"
                ? [noticeNotification]
                : category === undefined
                  ? [sellNotification, noticeNotification]
                  : [];
        return {
            data: {
                success: true,
                message: "",
                data: {
                    content,
                    nextCursor: null,
                    hasNext: false,
                    totalCount: content.length,
                    statusCounts,
                },
            },
        };
    });
    const user = userEvent.setup();

    renderPage();

    expect(await screen.findByText("아이폰 13, 지금 판매를 추천해요")).toBeInTheDocument();
    expect(screen.getByText("서비스 점검 안내")).toBeInTheDocument();
    expect(getNotifications).toHaveBeenLastCalledWith(
        { category: undefined, cursor: undefined, size: 20 },
        expect.anything(),
    );
    expect(screen.getByRole("button", { name: /전체/ })).toHaveTextContent("40");
    expect(screen.getByRole("button", { name: /판매추천/ })).toHaveTextContent("25");
    expect(screen.getByRole("button", { name: /공지/ })).toHaveTextContent("12");
    expect(screen.getByRole("link", { name: "판매 분석 보기" })).toHaveAttribute(
        "href",
        "/sell/manage?selected=10",
    );
    expect(screen.getByRole("button", { name: "전체2" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "판매추천" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /공지/ }));
    await waitFor(() =>
        expect(screen.queryByText("아이폰 13, 지금 판매를 추천해요")).not.toBeInTheDocument(),
    );
    expect(await screen.findByText("서비스 점검 안내")).toBeInTheDocument();
    expect(getNotifications).toHaveBeenLastCalledWith(
        { category: "NOTICE", cursor: undefined, size: 20 },
        expect.anything(),
    );

    await user.click(screen.getByRole("button", { name: /구매추천/ }));
    expect(await screen.findByText("해당하는 알림이 없습니다.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /판매추천/ })).toHaveTextContent("25");

    await user.click(screen.getByRole("button", { name: /전체/ }));
    await user.click(await screen.findByRole("button", { name: "읽음 처리" }));
    await waitFor(() => expect(markRead).toHaveBeenCalledWith(2));

    await user.click(screen.getAllByRole("button", { name: "알림 삭제" })[0]);
    await waitFor(() => expect(deleteNotification).toHaveBeenCalledWith(2));
});

it("알림이 없으면 빈 상태를 보여준다", async () => {
    getNotifications.mockResolvedValue({
        data: {
            success: true,
            message: "",
            data: {
                content: [],
                nextCursor: null,
                hasNext: false,
                totalCount: 0,
                statusCounts: { SELL: 0, BUY: 0, PRICE: 0, PLATFORM: 0, NOTICE: 0 },
            },
        },
    });

    renderPage();

    expect(await screen.findByText("아직 받은 알림이 없습니다.")).toBeInTheDocument();
});
