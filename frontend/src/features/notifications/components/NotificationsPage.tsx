"use client";

import { useState } from "react";
import Link from "next/link";
import { Bell, Trash2 } from "lucide-react";

import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/common/components/ui/AlertDialog";
import { Button } from "@/common/components/ui/Button";
import { Card, CardContent } from "@/common/components/ui/Card";
import { Skeleton } from "@/common/components/ui/Skeleton";
import { getApiErrorMessage } from "@/common/lib/api/error";
import { cn } from "@/common/lib/utils";

import { useReadNotificationMutation } from "../hooks/mutations/useReadNotificationMutation";
import { useDeleteAllNotificationsMutation } from "../hooks/mutations/useDeleteAllNotificationsMutation";
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
                                today
                                    ? "typography-body-small"
                                    : "font-brand typography-body-small",
                            )}
                        >
                            {notification.title}
                        </h3>
                        <div className="flex shrink-0 items-center gap-1">
                            <span
                                className={cn(
                                    "typography-body-small flex items-center gap-1 text-[#9b9fb1]",
                                    today && "typography-body-bold-small font-semibold",
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
                    <p className="typography-body-small text-[#83889e]">{notification.message}</p>
                    {(link || unread) && (
                        <div className="flex flex-wrap items-center gap-3 pt-2.5">
                            {link && (
                                <Button
                                    asChild
                                    className="typography-body-bold-small h-auto rounded-full bg-[#6653fb] px-4 py-1.5 font-semibold text-white hover:bg-[#5745e7] focus-visible:border-[#6653fb] focus-visible:ring-[#6653fb]/30"
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
                                    className="typography-body-bold-small h-auto px-0 py-0 font-semibold text-[#6653fb] underline hover:text-[#5745e7] focus-visible:border-[#6653fb] focus-visible:ring-[#6653fb]/30"
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

const dialogButtonFocusClassName =
    "focus-visible:!border-[#6653fb] focus-visible:ring-3 focus-visible:!ring-[#6653fb]/30";

function DeleteAllNotificationsDialog({
    open,
    onOpenChange,
    targetLabel,
    onConfirm,
    isPending,
    errorMessage,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    targetLabel: string | null;
    onConfirm: () => void;
    isPending: boolean;
    errorMessage: string | null;
}) {
    return (
        <AlertDialog open={open} onOpenChange={onOpenChange}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>
                        {targetLabel
                            ? `${targetLabel} 알림을 모두 삭제할까요?`
                            : "알림을 모두 삭제할까요?"}
                    </AlertDialogTitle>
                    <AlertDialogDescription>삭제한 알림은 되돌릴 수 없어요.</AlertDialogDescription>
                </AlertDialogHeader>
                {errorMessage && (
                    <p role="alert" className="text-destructive typography-body-small">
                        {errorMessage}
                    </p>
                )}
                <AlertDialogFooter>
                    <AlertDialogCancel
                        disabled={isPending}
                        className={`hover:!border-[#6653fb] hover:!bg-[#fafbff] hover:!text-[#6653fb] dark:hover:!bg-[#fafbff] ${dialogButtonFocusClassName}`}
                    >
                        취소
                    </AlertDialogCancel>
                    <AlertDialogAction
                        disabled={isPending}
                        onClick={(event) => {
                            // 삭제가 끝날 때까지 창을 닫지 않는다
                            event.preventDefault();
                            onConfirm();
                        }}
                        className={`hover:!bg-[#5745e7] dark:hover:!bg-[#5745e7] ${dialogButtonFocusClassName}`}
                    >
                        {isPending ? "삭제 중..." : "삭제"}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
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
            <p className="typography-body-small font-medium text-[#83889e]">
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
    const deleteMutation = useDeleteNotificationMutation();
    const deleteAllMutation = useDeleteAllNotificationsMutation();
    const [deleteAllOpen, setDeleteAllOpen] = useState(false);
    const pages = query.data?.pages ?? [];
    // 탭을 바꾸는 동안은 이전 탭 목록(placeholder)을 감추고 탭 숫자만 유지한다
    const visible = query.isPlaceholderData ? [] : pages.flatMap((page) => page.content);
    const statusCounts = pages.at(-1)?.statusCounts ?? {};
    const countOf = (value: "all" | NotificationCategory) =>
        value === "all"
            ? Object.values(statusCounts).reduce((sum, count) => sum + count, 0)
            : (statusCounts[toCategoryParam(value)] ?? 0);
    const filterLabel =
        filter === "all"
            ? null
            : (notificationFilters.find((item) => item.value === filter)?.label ?? null);
    const canDeleteAll = !query.isPending && !query.isPlaceholderData && visible.length > 0;
    const confirmDeleteAll = () =>
        deleteAllMutation.mutate(filter === "all" ? undefined : toCategoryParam(filter), {
            onSuccess: () => setDeleteAllOpen(false),
        });

    return (
        <main className="flex-1 bg-white">
            <div className="layout-container flex flex-col gap-12 pt-16 pb-24">
                <div className="flex flex-col items-start justify-between gap-8 md:flex-row md:items-end">
                    <div className="flex flex-col gap-1">
                        <p className="typography-heading-03 font-semibold text-[#6b6c7b]">
                            AI 시세 분석 결과와 중요 업데이트
                        </p>
                        <h1 className="typography-heading-01 font-bold text-[#363636]">알림</h1>
                    </div>
                </div>
                <div className="space-y-6">
                    <div className="overflow-x-auto border-b border-[#dee5ed]">
                        <div
                            role="tablist"
                            aria-label="알림 필터"
                            className="flex min-w-max items-stretch gap-[39px]"
                        >
                            {notificationFilters.map((item) => {
                                const count = countOf(item.value);
                                const isActive = filter === item.value;

                                return (
                                    <button
                                        key={item.value}
                                        type="button"
                                        role="tab"
                                        aria-selected={isActive}
                                        onClick={() => setFilter(item.value)}
                                        className={cn(
                                            "flex h-[46px] w-[100px] shrink-0 items-center justify-center border-b-2 whitespace-nowrap transition-colors",
                                            isActive
                                                ? "border-[#363636] text-[#363636]"
                                                : "border-transparent text-[#83889e] hover:text-[#363636]",
                                        )}
                                    >
                                        {isActive ? (
                                            <span className="flex items-center gap-1 tracking-[0.5px]">
                                                <span className="typography-heading-03 font-semibold">
                                                    {item.label}
                                                </span>
                                                <span className="typography-heading-03 inline-flex size-[30px] items-center justify-center rounded-full bg-[#363636] font-semibold text-white">
                                                    {count}
                                                </span>
                                            </span>
                                        ) : (
                                            <span className="typography-body-medium font-normal">
                                                {item.label} {count}
                                            </span>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                    {deleteMutation.isError && (
                        <p
                            role="alert"
                            className="typography-body-small font-medium text-[#d65353]"
                        >
                            알림을 삭제하지 못했습니다. {getApiErrorMessage(deleteMutation.error)}
                        </p>
                    )}
                    <div className="max-w-[976px] space-y-6">
                        {canDeleteAll && (
                            <div className="flex justify-end">
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="typography-body-bold-small rounded-full border-[#dcd8ff] font-semibold text-[#83889e] hover:border-[#6653fb] hover:bg-[#fafbff] hover:text-[#6653fb] focus-visible:border-[#6653fb] focus-visible:ring-[#6653fb]/30"
                                    onClick={() => {
                                        deleteAllMutation.reset();
                                        setDeleteAllOpen(true);
                                    }}
                                >
                                    <Trash2 aria-hidden="true" />
                                    {filterLabel ? `${filterLabel} 알림 전체 삭제` : "전체 삭제"}
                                </Button>
                            </div>
                        )}
                        {query.isPending || query.isPlaceholderData ? (
                            <NotificationListSkeleton />
                        ) : query.isError ? (
                            <div className="flex flex-col items-center gap-3 py-10">
                                <p role="alert" className="text-destructive typography-body-small">
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
                                        <h2 className="typography-body-small font-normal text-[#83889e]">
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
            <DeleteAllNotificationsDialog
                open={deleteAllOpen}
                onOpenChange={setDeleteAllOpen}
                targetLabel={filterLabel}
                onConfirm={confirmDeleteAll}
                isPending={deleteAllMutation.isPending}
                errorMessage={
                    deleteAllMutation.isError
                        ? `알림을 삭제하지 못했습니다. ${getApiErrorMessage(deleteAllMutation.error)}`
                        : null
                }
            />
        </main>
    );
}
