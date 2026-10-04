"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { X } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

import { Button } from "@/common/components/ui/Button";
import { useAuthStore } from "@/features/auth/store/authStore";

import { notificationApi } from "../api/notificationApi";
import { useReadNotificationMutation } from "../hooks/mutations/useReadNotificationMutation";
import { usePushEnabled } from "../lib/pushPreference";
import { type NotificationItem, notificationPageSchema } from "../schemas/notificationSchema";
import { NotificationTypeIcon } from "./NotificationTypeIcon";
import { getNotificationLink } from "../utils/notificationDisplay";

const pollIntervalMs = 30 * 1000;
const toastDurationMs = 6 * 1000;
const maxToasts = 3;

/** 푸시 알림을 켠 로그인 회원에게, 사이트를 보는 동안 새로 도착한 알림을 화면 오른쪽 아래 토스트로 띄운다. */
export function NotificationToaster() {
    const isInitialized = useAuthStore((state) => state.isInitialized);
    const isLoggedIn = useAuthStore((state) => state.isLoggedIn);
    const pushEnabled = usePushEnabled();
    const readMutation = useReadNotificationMutation();
    const [toasts, setToasts] = useState<NotificationItem[]>([]);
    // 처음 확인한 시점의 최신 알림 ID — 그 이후에 도착한 알림만 띄운다
    const lastSeenIdRef = useRef<number | null>(null);

    useQuery({
        queryKey: ["notification-toaster"],
        queryFn: async ({ signal }) => {
            const { data } = await notificationApi.getNotifications({ size: 10 }, signal);
            if (!data.success) throw new Error(data.message);
            const items = notificationPageSchema.parse(data.data).content;
            const latestId = Math.max(0, ...items.map((item) => item.notificationId));
            const lastSeenId = lastSeenIdRef.current;
            lastSeenIdRef.current = Math.max(lastSeenId ?? 0, latestId);
            if (lastSeenId !== null) {
                const fresh = items.filter(
                    (item) => item.notificationId > lastSeenId && !item.isRead,
                );
                if (fresh.length > 0) {
                    setToasts((current) => [...fresh, ...current].slice(0, maxToasts));
                }
            }
            return latestId;
        },
        enabled: isInitialized && isLoggedIn && pushEnabled,
        refetchInterval: pollIntervalMs,
        refetchIntervalInBackground: false,
        retry: false,
    });

    useEffect(() => {
        if (toasts.length === 0) return;
        const timer = window.setTimeout(
            () => setToasts((current) => current.slice(0, -1)),
            toastDurationMs,
        );
        return () => window.clearTimeout(timer);
    }, [toasts]);

    const dismiss = (notificationId: number) =>
        setToasts((current) => current.filter((item) => item.notificationId !== notificationId));

    if (!isLoggedIn || !pushEnabled) return null;

    return (
        <div
            role="status"
            aria-live="polite"
            className="pointer-events-none fixed right-4 bottom-4 z-50 flex w-[min(360px,calc(100vw-32px))] flex-col gap-2"
        >
            {toasts.map((notification) => {
                const link = getNotificationLink(notification);
                return (
                    <div
                        key={notification.notificationId}
                        className="pointer-events-auto flex items-start gap-3 rounded-xl border border-[#dee5ed] bg-white p-4 shadow-[0_6px_20px_rgba(54,51,100,0.15)]"
                    >
                        <NotificationTypeIcon
                            type={notification.type}
                            aria-hidden="true"
                            className="mt-0.5 size-5 shrink-0 text-[#6653fb]"
                        />
                        <div className="min-w-0 flex-1 space-y-1">
                            <p className="text-[13px] leading-5 font-semibold text-[#363364]">
                                {notification.title}
                            </p>
                            <p className="line-clamp-2 text-xs leading-5 text-[#83889e]">
                                {notification.message}
                            </p>
                            {link && (
                                <Link
                                    href={link.href}
                                    className="inline-block text-xs leading-5 font-semibold text-[#6653fb] underline"
                                    onClick={() => {
                                        readMutation.mutate(notification.notificationId);
                                        dismiss(notification.notificationId);
                                    }}
                                >
                                    {link.label}
                                </Link>
                            )}
                        </div>
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            aria-label="알림 닫기"
                            className="size-6 shrink-0 text-[#9b9fb1]"
                            onClick={() => dismiss(notification.notificationId)}
                        >
                            <X className="size-4" />
                        </Button>
                    </div>
                );
            })}
        </div>
    );
}
