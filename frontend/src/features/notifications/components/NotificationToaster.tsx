"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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
const toastDurationMs = 8 * 1000;
const maxToasts = 3;

/** 푸시 알림을 켠 로그인 회원에게, 사이트를 보는 동안 새로 도착한 알림을 화면 상단 가운데(헤더 아래) 토스트로 띄운다. */
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

    const dismiss = useCallback(
        (notificationId: number) =>
            setToasts((current) =>
                current.filter((item) => item.notificationId !== notificationId),
            ),
        [],
    );

    if (!isLoggedIn || !pushEnabled) return null;

    return (
        <div
            role="status"
            aria-live="polite"
            className="pointer-events-none fixed top-[calc(var(--header-height)+32px)] left-1/2 z-50 flex w-[min(440px,calc(100vw-32px))] -translate-x-1/2 flex-col gap-3"
        >
            {toasts.map((notification) => (
                <NotificationToast
                    key={notification.notificationId}
                    notification={notification}
                    onDismiss={dismiss}
                    onRead={(notificationId) => readMutation.mutate(notificationId)}
                />
            ))}
        </div>
    );
}

/** 토스트 한 개 — 각자 {@link toastDurationMs} 뒤 닫히고, 마우스를 올리거나 포커스가 있는 동안은 멈췄다가 남은 시간부터 다시 센다. */
function NotificationToast({
    notification,
    onDismiss,
    onRead,
}: {
    notification: NotificationItem;
    onDismiss: (notificationId: number) => void;
    onRead: (notificationId: number) => void;
}) {
    const [paused, setPaused] = useState(false);
    const remainingMsRef = useRef(toastDurationMs);
    const { notificationId } = notification;
    const link = getNotificationLink(notification);

    useEffect(() => {
        if (paused) return;
        const startedAt = Date.now();
        const timer = window.setTimeout(() => onDismiss(notificationId), remainingMsRef.current);
        return () => {
            window.clearTimeout(timer);
            remainingMsRef.current = Math.max(0, remainingMsRef.current - (Date.now() - startedAt));
        };
    }, [paused, notificationId, onDismiss]);

    return (
        <div
            className="pointer-events-auto flex items-start gap-4 rounded-2xl border border-[#dee5ed] bg-white p-5 shadow-[0_8px_24px_rgba(54,51,100,0.18)]"
            onMouseEnter={() => setPaused(true)}
            onMouseLeave={() => setPaused(false)}
            onFocus={() => setPaused(true)}
            onBlur={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget)) setPaused(false);
            }}
        >
            <NotificationTypeIcon
                type={notification.type}
                aria-hidden="true"
                className="mt-0.5 size-6 shrink-0 text-[#6653fb]"
            />
            <div className="min-w-0 flex-1 space-y-1">
                <p className="text-[15px] leading-6 font-semibold text-[#363364]">
                    {notification.title}
                </p>
                <p className="line-clamp-3 text-sm leading-[22px] text-[#83889e]">
                    {notification.message}
                </p>
                {link && (
                    <Link
                        href={link.href}
                        className="inline-block text-[13px] leading-5 font-semibold text-[#6653fb] underline"
                        onClick={() => {
                            onRead(notificationId);
                            onDismiss(notificationId);
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
                className="size-7 shrink-0 text-[#9b9fb1]"
                onClick={() => onDismiss(notificationId)}
            >
                <X className="size-5" />
            </Button>
        </div>
    );
}
