import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, expect, it, vi } from "vitest";

import { NotificationsPage } from "./NotificationsPage";

const { getNotifications, markRead, deleteNotification, deleteAllNotifications } = vi.hoisted(
    () => ({
        getNotifications: vi.fn(),
        markRead: vi.fn(),
        deleteNotification: vi.fn(),
        deleteAllNotifications: vi.fn(),
    }),
);

vi.mock("../api/notificationApi", () => ({
    notificationApi: { getNotifications, markRead, deleteNotification, deleteAllNotifications },
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
    deleteAllNotifications.mockReset();
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
    expect(screen.getByRole("tab", { name: /전체/ })).toHaveTextContent("40");
    expect(screen.getByRole("tab", { name: /판매추천/ })).toHaveTextContent("25");
    expect(screen.getByRole("tab", { name: /구매추천/ })).toHaveTextContent("0");
    expect(screen.getByRole("link", { name: "판매 분석 보기" })).toHaveAttribute(
        "href",
        "/sell/manage?selected=10",
    );
    expect(screen.getByRole("tab", { name: /판매추천/ })).toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: /구매추천/ }));
    await waitFor(() =>
        expect(screen.queryByText("아이폰 13, 지금 판매를 추천해요")).not.toBeInTheDocument(),
    );
    expect(await screen.findByText("해당하는 알림이 없습니다.")).toBeInTheDocument();
    expect(getNotifications).toHaveBeenLastCalledWith(
        { category: "BUY", cursor: undefined, size: 20 },
        expect.anything(),
    );

    await user.click(screen.getByRole("tab", { name: /전체/ }));
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

it("알림 삭제에 실패하면 알림을 복구하고 오류를 안내한다", async () => {
    getNotifications.mockResolvedValue({
        data: {
            success: true,
            message: "",
            data: {
                content: [
                    {
                        notificationId: 3,
                        type: "BUY",
                        title: "구매 추천 알림",
                        message: "관심 상품을 확인해 보세요.",
                        productId: null,
                        listingId: 77,
                        isRead: false,
                        createdAt: new Date().toISOString(),
                    },
                ],
                nextCursor: null,
                hasNext: false,
                totalCount: 1,
            },
        },
    });
    deleteNotification.mockRejectedValue(new Error("네트워크 오류"));
    const user = userEvent.setup();

    renderPage();

    expect(await screen.findByText("구매 추천 알림")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "알림 삭제" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
        "알림을 삭제하지 못했습니다. 네트워크 오류",
    );
    expect(screen.getByText("구매 추천 알림")).toBeInTheDocument();
});

function mockNotificationList(content: unknown[]) {
    getNotifications.mockResolvedValue({
        data: {
            success: true,
            message: "",
            data: {
                content,
                nextCursor: null,
                hasNext: false,
                totalCount: content.length,
                statusCounts: { SELL: 1, BUY: 0, PRICE: 0, PLATFORM: 0, NOTICE: 1 },
            },
        },
    });
}

it("전체 탭에서 확인을 거쳐 알림을 모두 삭제하고 목록을 다시 불러온다", async () => {
    mockNotificationList([sellNotification, noticeNotification]);
    deleteAllNotifications.mockImplementation(async () => {
        mockNotificationList([]);
        return { data: { success: true, message: "", data: { deletedCount: 2 } } };
    });
    const user = userEvent.setup();

    renderPage();

    await user.click(await screen.findByRole("button", { name: "전체 삭제" }));
    const dialog = await screen.findByRole("alertdialog", { name: "알림을 모두 삭제할까요?" });
    await user.click(within(dialog).getByRole("button", { name: "삭제" }));

    await waitFor(() => expect(deleteAllNotifications).toHaveBeenCalledWith(undefined));
    expect(await screen.findByText("아직 받은 알림이 없습니다.")).toBeInTheDocument();
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "전체 삭제" })).not.toBeInTheDocument();
});

it("탭을 고르면 그 탭 알림만 지우고, 취소하면 지우지 않는다", async () => {
    mockNotificationList([sellNotification]);
    deleteAllNotifications.mockResolvedValue({
        data: { success: true, message: "", data: { deletedCount: 1 } },
    });
    const user = userEvent.setup();

    renderPage();

    await user.click(await screen.findByRole("tab", { name: /판매추천/ }));
    await user.click(await screen.findByRole("button", { name: "판매추천 알림 전체 삭제" }));
    let dialog = await screen.findByRole("alertdialog", {
        name: "판매추천 알림을 모두 삭제할까요?",
    });
    await user.click(within(dialog).getByRole("button", { name: "취소" }));
    expect(deleteAllNotifications).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "판매추천 알림 전체 삭제" }));
    dialog = await screen.findByRole("alertdialog");
    await user.click(within(dialog).getByRole("button", { name: "삭제" }));
    await waitFor(() => expect(deleteAllNotifications).toHaveBeenCalledWith("SELL"));
});

it("일괄 삭제에 실패하면 확인 창에 오류를 보여 주고 목록은 그대로 둔다", async () => {
    mockNotificationList([sellNotification]);
    deleteAllNotifications.mockRejectedValue(new Error("네트워크 오류"));
    const user = userEvent.setup();

    renderPage();

    await user.click(await screen.findByRole("button", { name: "전체 삭제" }));
    const dialog = await screen.findByRole("alertdialog");
    await user.click(within(dialog).getByRole("button", { name: "삭제" }));

    expect(await within(dialog).findByRole("alert")).toHaveTextContent(
        "알림을 삭제하지 못했습니다. 네트워크 오류",
    );
    expect(screen.getByText("아이폰 13, 지금 판매를 추천해요")).toBeInTheDocument();
});
