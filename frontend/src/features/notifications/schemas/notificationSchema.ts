import { z } from "zod";

export const notificationTypeSchema = z.enum([
    "SELL",
    "HOLD",
    "BUY",
    "WAIT",
    "NOTICE",
    "TARGET_PRICE",
    "PLATFORM_EXPIRED",
    "SELL_PRICE_CHANGE",
    "BUY_PRICE_CHANGE",
    "SELL_TARGET_PRICE",
]);

export const notificationSchema = z.object({
    notificationId: z.number(),
    type: notificationTypeSchema,
    title: z.string(),
    message: z.string(),
    productId: z.number().nullable(),
    listingId: z.number().nullable(),
    isRead: z.boolean(),
    createdAt: z.string(),
});

export const notificationPageSchema = z.object({
    content: z.array(notificationSchema),
    nextCursor: z.string().nullable(),
    hasNext: z.boolean(),
    totalCount: z.number().nullable(),
    // 탭(SELL/BUY/PRICE/PLATFORM/NOTICE)별 전체 건수 — 탭 필터와 무관
    statusCounts: z.record(z.number()).nullish(),
});

export const notificationUnreadCountSchema = z.object({
    count: z.number().int().nonnegative(),
});

export const notificationSettingsSchema = z.object({
    recommendationEnabled: z.boolean(),
    priceChangeEnabled: z.boolean(),
    targetPriceEnabled: z.boolean(),
    platformExpiryEnabled: z.boolean(),
    marketingEnabled: z.boolean(),
});

export type NotificationType = z.infer<typeof notificationTypeSchema>;
/** 알림 목록 탭 필터(`GET /notifications?category=`) — 생략하면 전체. */
export type NotificationCategoryParam = "SELL" | "BUY" | "PRICE" | "PLATFORM" | "NOTICE";
export type NotificationItem = z.infer<typeof notificationSchema>;
export type NotificationPage = z.infer<typeof notificationPageSchema>;
export type NotificationUnreadCount = z.infer<typeof notificationUnreadCountSchema>;
export type NotificationSettings = z.infer<typeof notificationSettingsSchema>;
export type NotificationSettingKey = keyof NotificationSettings;
