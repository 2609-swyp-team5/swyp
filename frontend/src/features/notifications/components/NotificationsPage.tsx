"use client";

import { useState } from "react";
import Link from "next/link";

import { Button } from "@/common/components/ui/Button";
import { Card, CardContent } from "@/common/components/ui/Card";
import { getApiErrorMessage } from "@/common/lib/api/error";
import { cn } from "@/common/lib/utils";

import { useReadNotificationMutation } from "../hooks/mutations/useReadNotificationMutation";
import { useNotificationsQuery } from "../hooks/queries/useNotificationsQuery";
import type { NotificationItem } from "../schemas/notificationSchema";
import { NotificationTypeIcon } from "./NotificationTypeIcon";
import {
    formatNotificationTime,
    getNotificationCategory,
    getNotificationLink,
    isToday,
    notificationFilters,
    type NotificationCategory,
} from "../utils/notificationDisplay";

function NotificationCard({
    notification,
    today,
    onRead,
}: {
    notification: NotificationItem;
    today: boolean;
    onRead: (notificationId: number) => void;
}) {
    const category = getNotificationCategory(notification.type);
    const link = getNotificationLink(notification);
    const unread = !notification.isRead;

    return (
        <Card
            className={cn(
                "gap-0 rounded-xl px-5 py-4 ring-0",
                unread
                    ? "border border-transparent bg-[#fafbff]"
                    : "border border-[#83889e] bg-white",
            )}
        >
            <CardContent className="flex items-start gap-3 p-0">
                <NotificationTypeIcon
                    type={notification.type}
                    aria-hidden="true"
                    className={cn(
                        "mt-0.5 size-5 shrink-0",
                        category === "notice"
                            ? "text-[#fa503d]"
                            : unread
                              ? "text-[#6653fb]"
                              : "text-[#b8b8b8]",
                    )}
                />
                <div className="min-w-0 flex-1 space-y-0.5">
                    <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
                        <h3
                            className={cn(
                                "leading-5 font-semibold text-[#363364]",
                                today ? "text-[13px] tracking-[-0.5px]" : "font-brand text-[14px]",
                            )}
                        >
                            {notification.title}
                        </h3>
                        <span
                            className={cn(
                                "flex shrink-0 items-center gap-1 text-xs leading-5 text-[#9b9fb1]",
                                today && "text-[13px] font-semibold",
                            )}
                        >
                            {unread && (
                                <span
                                    className="size-1.5 rounded-full bg-[#6653fb]"
                                    aria-label="읽지 않음"
                                />
                            )}
                            {formatNotificationTime(notification.createdAt)}
                        </span>
                    </div>
                    <p className="text-xs leading-5 tracking-[-0.5px] text-[#83889e]">
                        {notification.message}
                    </p>
                    {(link || unread) && (
                        <div className="flex flex-wrap items-center gap-3 pt-2.5">
                            {link && (
                                <Button
                                    asChild
                                    className="h-auto rounded-full bg-[#6653fb] px-4 py-1.5 text-[13px] leading-5 font-semibold text-white"
                                >
                                    <Link
                                        href={link.href}
                                        onClick={() =>
                                            unread && onRead(notification.notificationId)
                                        }
                                    >
                                        {link.label}
                                    </Link>
                                </Button>
                            )}
                            {unread && (
                                <Button
                                    type="button"
                                    variant="link"
                                    className="h-auto px-0 py-0 text-[13px] leading-5 font-semibold text-[#6653fb] underline"
                                    onClick={() => onRead(notification.notificationId)}
                                >
                                    읽음 처리
                                </Button>
                            )}
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}

export function NotificationsPage() {
    const [filter, setFilter] = useState<"all" | NotificationCategory>("all");
    const query = useNotificationsQuery();
    const readMutation = useReadNotificationMutation();
    const notifications = query.data?.pages.flatMap((page) => page.content) ?? [];
    const visible = notifications.filter(
        (item) => filter === "all" || getNotificationCategory(item.type) === filter,
    );

    return (
        <main className="flex-1 bg-white">
            <div className="layout-container space-y-[50px] pt-[60px] pb-20">
                <div>
                    <p className="text-base leading-[30px] font-semibold tracking-[0.5px] text-[#83889e] md:text-[20px]">
                        AI 시세 분석 결과와 중요 업데이트
                    </p>
                    <h1 className="text-[40px] leading-[55px] font-bold tracking-[0.5px] text-[#363636] lg:text-[60px] lg:leading-[75px]">
                        알림
                    </h1>
                </div>
                <div className="space-y-6">
                    <div
                        role="group"
                        aria-label="알림 필터"
                        className="flex h-10 gap-5 overflow-x-auto border-b border-[#dee5ed] lg:gap-[39px]"
                    >
                        {notificationFilters.map((item) => {
                            const count = notifications.filter(
                                (notification) =>
                                    item.value === "all" ||
                                    getNotificationCategory(notification.type) === item.value,
                            ).length;
                            return (
                                <Button
                                    key={item.value}
                                    type="button"
                                    variant="ghost"
                                    aria-pressed={filter === item.value}
                                    onClick={() => setFilter(item.value)}
                                    className={cn(
                                        "h-full shrink-0 gap-2 rounded-none border-x-0 border-t-0 border-b-2 px-0 pt-0 pb-2 text-base leading-[25px] font-normal hover:bg-transparent",
                                        filter === item.value
                                            ? "border-[#363636] text-[#363636]"
                                            : "border-transparent text-[#6b6c7b]",
                                        item.value === "all"
                                            ? "text-[20px] leading-[30px] font-semibold"
                                            : "min-w-[100px]",
                                    )}
                                >
                                    {item.label}
                                    <span
                                        className={cn(
                                            item.value === "all" &&
                                                "flex size-[30px] items-center justify-center rounded-full bg-[#363636] text-white",
                                        )}
                                    >
                                        {count}
                                    </span>
                                </Button>
                            );
                        })}
                    </div>
                    <div className="max-w-[976px] space-y-6">
                        {query.isPending ? (
                            <p role="status" className="py-10 text-center text-[#83889e]">
                                알림을 불러오는 중입니다.
                            </p>
                        ) : query.isError ? (
                            <div className="flex flex-col items-center gap-3 py-10">
                                <p role="alert" className="text-destructive text-sm">
                                    {getApiErrorMessage(query.error)}
                                </p>
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => void query.refetch()}
                                >
                                    다시 시도
                                </Button>
                            </div>
                        ) : visible.length === 0 ? (
                            <p className="py-10 text-center text-[#83889e]">
                                {filter === "all"
                                    ? "아직 받은 알림이 없습니다."
                                    : "해당하는 알림이 없습니다."}
                            </p>
                        ) : (
                            [true, false].map((today) => {
                                const items = visible.filter(
                                    (item) => isToday(item.createdAt) === today,
                                );
                                if (!items.length) return null;
                                return (
                                    <section
                                        key={String(today)}
                                        aria-label={today ? "오늘 알림" : "이전 알림"}
                                        className="space-y-3"
                                    >
                                        <h2 className="text-xs leading-4 font-normal text-[#83889e]">
                                            {today ? "오늘" : "이전"}
                                        </h2>
                                        {items.map((item) => (
                                            <NotificationCard
                                                key={item.notificationId}
                                                notification={item}
                                                today={today}
                                                onRead={(id) => readMutation.mutate(id)}
                                            />
                                        ))}
                                    </section>
                                );
                            })
                        )}
                        {query.hasNextPage && (
                            <Button
                                type="button"
                                variant="outline"
                                disabled={query.isFetchingNextPage}
                                onClick={() => void query.fetchNextPage()}
                            >
                                {query.isFetchingNextPage ? "불러오는 중..." : "이전 알림 더 보기"}
                            </Button>
                        )}
                    </div>
                </div>
            </div>
        </main>
    );
}
