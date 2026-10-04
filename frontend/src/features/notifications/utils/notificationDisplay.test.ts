import { describe, expect, it } from "vitest";

import type { NotificationItem } from "../schemas/notificationSchema";
import {
    formatNotificationTime,
    getNotificationCategory,
    getNotificationLink,
} from "./notificationDisplay";

const base: NotificationItem = {
    notificationId: 1,
    type: "SELL",
    title: "제목",
    message: "내용",
    productId: 10,
    listingId: null,
    isRead: false,
    createdAt: "2026-10-05T09:00:00",
};

describe("notificationDisplay", () => {
    it("알림 종류를 판매추천·구매추천·공지로 나눈다", () => {
        expect(getNotificationCategory("HOLD")).toBe("sell");
        expect(getNotificationCategory("TARGET_PRICE")).toBe("buy");
        expect(getNotificationCategory("NOTICE")).toBe("notice");
    });

    it("판매 추천은 판매 관리, 구매 쪽은 상품 상세로 연결하고 대상이 없으면 링크가 없다", () => {
        expect(getNotificationLink(base)?.href).toBe("/sell/manage?selected=10");
        expect(
            getNotificationLink({ ...base, type: "BUY", productId: null, listingId: 77 })?.href,
        ).toBe("/search/77");
        expect(
            getNotificationLink({ ...base, type: "NOTICE", productId: null, listingId: null }),
        ).toBeNull();
    });

    it("오늘은 상대 시간, 어제는 '어제', 그 전은 날짜로 표시한다", () => {
        const now = new Date("2026-10-05T12:00:00");
        expect(formatNotificationTime("2026-10-05T11:30:00", now)).toBe("30분 전");
        expect(formatNotificationTime("2026-10-05T09:00:00", now)).toBe("3시간 전");
        expect(formatNotificationTime("2026-10-04T09:00:00", now)).toBe("어제");
        expect(formatNotificationTime("2026-10-01T09:00:00", now)).toBe("10월 1일");
    });
});
