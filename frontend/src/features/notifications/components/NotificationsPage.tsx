"use client";

import { useState } from "react";
import Link from "next/link";
import { Bell, Trash2 } from "lucide-react";

import { Button } from "@/common/components/ui/Button";
import { Card, CardContent } from "@/common/components/ui/Card";
import { Skeleton } from "@/common/components/ui/Skeleton";
import { getApiErrorMessage } from "@/common/lib/api/error";
import { cn } from "@/common/lib/utils";

import { useReadNotificationMutation } from "../hooks/mutations/useReadNotificationMutation";
import { useDeleteNotificationMutation } from "../hooks/mutations/useDeleteNotificationMutation";
import { useNotificationsQuery } from "../hooks/queries/useNotificationsQuery";
import type { NotificationItem } from "../schemas/notificationSchema";
import { NotificationTypeIcon } from "./NotificationTypeIcon";
import {
    formatNotificationTime,
    getNotificationCategory,
    getNotificationLink,
    isToday,
    notificationFilters,
    toCategoryParam,
    type NotificationCategory,
} from "../utils/notificationDisplay";

function NotificationCard({
    notification,
    today,
    onRead,
    onDelete,
}: {
    notification: NotificationItem;
    today: boolean;
    onRead: (notificationId: number) => void;
    onDelete: (notificationId: number) => void;
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
                        <div className="flex shrink-0 items-center gap-1">
                            <span
                                className={cn(
                                    "flex items-center gap-1 text-xs leading-5 text-[#9b9fb1]",
                                    today && "text-[13px] font-semibold",
                                )}
                            >
                                {unread && (
                                    <span
                                        className="size-1.5 rounded-full bg-[#6653fb]"
                                        aria-label="읽지 않음"
                                    />
                                )}
                                <time dateTime={notification.createdAt}>
                                    {formatNotificationTime(notification.createdAt)}
                                </time>
                            </span>
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon-sm"
                                aria-label="알림 삭제"
                                title="알림 삭제"
                                className="text-[#9b9fb1] hover:bg-[#f0edff] hover:text-[#6653fb] focus-visible:border-[#6653fb] focus-visible:ring-[#6653fb]/30"
                                onClick={() => onDelete(notification.notificationId)}
                            >
                                <Trash2 aria-hidden="true" />
                            </Button>
                        </div>
                    </div>
                    <p className="text-xs leading-5 tracking-[-0.5px] text-[#83889e]">
                        {notification.message}
                    </p>
                    {(link || unread) && (
                        <div className="flex flex-wrap items-center gap-3 pt-2.5">
                            {link && (
                                <Button
                                    asChild
                                    className="h-auto rounded-full bg-[#6653fb] px-4 py-1.5 text-[13px] leading-5 font-semibold text-white hover:bg-[#5745e7] focus-visible:border-[#6653fb] focus-visible:ring-[#6653fb]/30"
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
                                    className="h-auto px-0 py-0 text-[13px] leading-5 font-semibold text-[#6653fb] underline hover:text-[#5745e7] focus-visible:border-[#6653fb] focus-visible:ring-[#6653fb]/30"
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

function NotificationListSkeleton() {
    return (
        <div role="status" aria-label="알림 불러오는 중" className="space-y-3">
            {Array.from({ length: 3 }, (_, index) => (
                <Card
                    key={index}
                    aria-hidden="true"
                    className="gap-0 rounded-xl border border-[#eef0f5] bg-white px-5 py-4 ring-0"
                >
                    <CardContent className="flex items-start gap-3 p-0">
                        <Skeleton className="mt-0.5 size-5 shrink-0 rounded-full bg-[#f0edff]" />
                        <div className="min-w-0 flex-1 space-y-2">
                            <div className="flex items-center justify-between gap-3">
                                <Skeleton className="h-4 w-40 bg-[#eef0f5]" />
                                <Skeleton className="h-3 w-14 bg-[#eef0f5]" />
                            </div>
                            <Skeleton className="h-4 w-4/5 bg-[#eef0f5]" />
                            <Skeleton className="h-8 w-28 rounded-full bg-[#f0edff]" />
                        </div>
                    </CardContent>
                </Card>
            ))}
        </div>
    );
}

function NotificationEmptyState({ filtered }: { filtered: boolean }) {
    return (
        <div className="flex flex-col items-center justify-center rounded-[20px] border border-dashed border-[#dcd8ff] bg-[#fafbff] px-6 py-16 text-center">
            <Bell aria-hidden="true" className="mb-4 size-9 text-[#b8b2ff]" />
            <p className="text-sm leading-6 font-medium text-[#83889e]">
                {filtered ? "해당하는 알림이 없습니다." : "아직 받은 알림이 없습니다."}
            </p>
            {!filtered && (
                <Button
                    asChild
                    className="mt-5 rounded-full bg-[#6653fb] px-5 font-semibold text-white hover:bg-[#5745e7] focus-visible:border-[#6653fb] focus-visible:ring-[#6653fb]/30"
                >
                    <Link href="/my/notifications">알림 설정 확인</Link>
                </Button>
            )}
        </div>
    );
}

export function NotificationsPage() {
    const [filter, setFilter] = useState<"all" | NotificationCategory>("all");
    const query = useNotificationsQuery(filter === "all" ? undefined : toCategoryParam(filter));
    const readMutation = useReadNotificationMutation();
    const pages = query.data?.pages ?? [];
    // 탭을 바꾸는 동안은 이전 탭 목록(placeholder)을 감추고 탭 숫자만 유지한다
    const visible = query.isPlaceholderData ? [] : pages.flatMap((page) => page.content);
    const statusCounts = pages.at(-1)?.statusCounts ?? {};
    const countOf = (value: "all" | NotificationCategory) =>
        value === "all"
            ? Object.values(statusCounts).reduce((sum, count) => sum + count, 0)
            : (statusCounts[toCategoryParam(value)] ?? 0);

    return (
        <main className="flex-1 bg-white">
            <div className="layout-container space-y-[50px] pt-[60px] pb-20">
                <div>
                    <p className="text-base leading-[30px] font-semibold tracking-[0.5px] text-[#83889e] md:text-[20px]">
                        AI 시세 분석 결과와 중요 업데이트
                    </p>
                    <h1 className="text-[40px] leading-[55px] font-bold tracking-[0.5px] text-[#363636] lg:text-[50px] lg:leading-[64px]">
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
                            const count = countOf(item.value);
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
                                    {item.value === "all" && (
                                        <span className="flex size-[30px] items-center justify-center rounded-full bg-[#363636] text-white">
                                            {totalCount}
                                        </span>
                                    )}
                                </Button>
                            );
                        })}
                    </div>
                    {deleteMutation.isError && (
                        <p role="alert" className="text-sm font-medium text-[#d65353]">
                            알림을 삭제하지 못했습니다. {getApiErrorMessage(deleteMutation.error)}
                        </p>
                    )}
                    <div className="max-w-[976px] space-y-6">
                        {query.isPending || query.isPlaceholderData ? (
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
                            <NotificationEmptyState filtered={filter !== "all"} />
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
                                                onDelete={(id) => deleteMutation.mutate(id)}
                                            />
                                        ))}
                                    </section>
                                );
                            })
                        )}
                        {query.hasNextPage && !query.isPlaceholderData && (
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
