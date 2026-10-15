"use client";

import { useQuery } from "@tanstack/react-query";

import { api } from "@/common/lib/api/client";
import type { ApiResponse } from "@/common/lib/api/types";
import {
    type NotificationPage,
    notificationPageSchema,
} from "@/features/notifications/schemas/notificationSchema";

import { aiTimingAlertsQueryKey } from "../../queryKeys";

/** AI 타이밍 알림 — 판매·구매 추천 알림 최근 2건. */
export function useAiTimingAlertsQuery() {
    return useQuery({
        queryKey: aiTimingAlertsQueryKey,
        queryFn: async ({ signal }) => {
            const { data } = await api.get<ApiResponse<NotificationPage>>("/notifications", {
                params: { category: "SELL,BUY", size: 2, withCounts: false },
                signal,
            });
            if (!data.success) {
                throw new Error(data.message);
            }
            return notificationPageSchema.parse(data.data).content;
        },
    });
}
