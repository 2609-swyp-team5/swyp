import type { NotificationItem, NotificationType } from "../schemas/notificationSchema";

export type NotificationCategory = "sell" | "buy" | "notice";

export const notificationFilters: { value: "all" | NotificationCategory; label: string }[] = [
    { value: "all", label: "전체" },
    { value: "sell", label: "판매추천" },
    { value: "buy", label: "구매추천" },
    { value: "notice", label: "공지" },
];

const categoryByType: Record<NotificationType, NotificationCategory> = {
    SELL: "sell",
    HOLD: "sell",
    BUY: "buy",
    WAIT: "buy",
    TARGET_PRICE: "buy",
    NOTICE: "notice",
};

export function getNotificationCategory(type: NotificationType) {
    return categoryByType[type];
}

/** 알림 대상 화면 — 판매 추천은 판매 관리에서 해당 상품 선택, 구매 쪽은 상품 상세, 대상이 없으면 null. */
export function getNotificationLink(notification: NotificationItem) {
    if (getNotificationCategory(notification.type) === "sell" && notification.productId !== null) {
        return { label: "판매 분석 보기", href: `/sell/manage?selected=${notification.productId}` };
    }
    const targetId = notification.productId ?? notification.listingId;
    if (targetId === null) return null;
    return { label: "상품 분석 보기", href: `/search/${targetId}` };
}

export function isToday(createdAt: string, now = new Date()) {
    return new Date(createdAt).toDateString() === now.toDateString();
}

/** 오늘은 "N분 전"/"N시간 전", 어제는 "어제", 그 전은 "M월 D일". */
export function formatNotificationTime(createdAt: string, now = new Date()) {
    const date = new Date(createdAt);
    if (isToday(createdAt, now)) {
        const minutes = Math.max(0, Math.floor((now.getTime() - date.getTime()) / 60000));
        if (minutes < 1) return "방금 전";
        if (minutes < 60) return `${minutes}분 전`;
        return `${Math.floor(minutes / 60)}시간 전`;
    }
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    if (date.toDateString() === yesterday.toDateString()) return "어제";
    return date.toLocaleDateString("ko-KR", { month: "long", day: "numeric" });
}
