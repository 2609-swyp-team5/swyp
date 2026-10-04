import { z } from "zod";

export const notificationTypeSchema = z.enum([
    "SELL",
    "HOLD",
    "BUY",
    "WAIT",
    "NOTICE",
    "TARGET_PRICE",
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
});

export const notificationSettingsSchema = z.object({
    recommendationEnabled: z.boolean(),
    priceChangeEnabled: z.boolean(),
    targetPriceEnabled: z.boolean(),
    platformExpiryEnabled: z.boolean(),
    marketingEnabled: z.boolean(),
});

export type NotificationType = z.infer<typeof notificationTypeSchema>;
export type NotificationItem = z.infer<typeof notificationSchema>;
export type NotificationPage = z.infer<typeof notificationPageSchema>;
export type NotificationSettings = z.infer<typeof notificationSettingsSchema>;
export type NotificationSettingKey = keyof NotificationSettings;
