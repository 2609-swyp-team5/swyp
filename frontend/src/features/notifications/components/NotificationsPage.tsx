"use client";

import { useState } from "react";
import Link from "next/link";
import { CircleAlert, Clock3, TrendingDown, TrendingUp } from "lucide-react";
import { Button } from "@/common/components/ui/Button";
import { Card, CardContent } from "@/common/components/ui/Card";
import { cn } from "@/common/lib/utils";

const notifications = [
    {
        id: 1,
        category: "sell",
        today: true,
        icon: TrendingUp,
        title: "필름카메라 FM2, 판매 추천으로 변경",
        description: "평균 등록가 +4.8% 상승",
        time: "10분 전",
        actions: [
            { label: "판매가 수정", href: "/sell/manage" },
            { label: "분석 보기", href: "/search/1" },
        ],
    },
    {
        id: 2,
        category: "connection",
        today: true,
        icon: CircleAlert,
        title: "번개장터 연결이 만료됐어요",
        description: "판매 상태 동기화를 위해 다시 연결하세요",
        time: "10분 전",
        actions: [{ label: "다시 연결", href: "/my/platforms" }],
    },
    {
        id: 3,
        category: "buy",
        today: false,
        icon: TrendingDown,
        title: "다이슨 에어랩 시세 하락 중",
        description: "이번 주 평균 시세 -2.1%",
        time: "어제",
        actions: [{ label: "가격 동향 확인", href: "/search/3" }],
    },
    {
        id: 4,
        category: "status",
        today: false,
        icon: Clock3,
        title: "아이패드 프로, 등록 14일째",
        description: "가격 조정 또는 게시글 수정을 고려해보세요",
        time: "3일 전",
        actions: [
            { label: "가격 조정", href: "/sell/manage" },
            { label: "게시글 수정", href: "/sell/manage" },
        ],
    },
    {
        id: 5,
        category: "buy",
        today: false,
        icon: TrendingUp,
        title: "소니 WH-1000XM5 구매 적기",
        description: "최근 최저가 근접, 평균 대비 -8.2%",
        time: "어제",
        actions: [{ label: "구매 분석 보기", href: "/search/5" }],
    },
];
const filters = [
    { value: "all", label: "전체" },
    { value: "sell", label: "판매추천" },
    { value: "buy", label: "구매추천" },
    { value: "status", label: "상품 상태" },
    { value: "connection", label: "연동" },
];

export function NotificationsPage() {
    const [filter, setFilter] = useState("all");
    const visible = notifications.filter((item) => filter === "all" || item.category === filter);
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
                        {filters.map((item) => {
                            const count = notifications.filter(
                                (notification) =>
                                    item.value === "all" || notification.category === item.value,
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
                        {[true, false].map((today) => {
                            const items = visible.filter((item) => item.today === today);
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
                                        <Card
                                            key={item.id}
                                            className={cn(
                                                "gap-0 rounded-xl px-5 py-4 ring-0",
                                                today
                                                    ? "border border-transparent bg-[#fafbff]"
                                                    : "border border-[#83889e] bg-white",
                                            )}
                                        >
                                            <CardContent className="flex items-start gap-3 p-0">
                                                <item.icon
                                                    aria-hidden="true"
                                                    className={cn(
                                                        "mt-0.5 size-5 shrink-0",
                                                        item.category === "connection"
                                                            ? "text-[#fa503d]"
                                                            : item.category === "status"
                                                              ? "text-[#83889e]"
                                                              : today
                                                                ? "text-[#6653fb]"
                                                                : item.icon === TrendingDown
                                                                  ? "text-[#b8b8b8]"
                                                                  : "text-[#5d8bff]",
                                                    )}
                                                />
                                                <div className="min-w-0 flex-1 space-y-0.5">
                                                    <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
                                                        <h3
                                                            className={cn(
                                                                "leading-5 font-semibold text-[#363364]",
                                                                today
                                                                    ? "text-[13px] tracking-[-0.5px]"
                                                                    : "font-brand text-[14px]",
                                                            )}
                                                        >
                                                            {item.title}
                                                        </h3>
                                                        <span
                                                            className={cn(
                                                                "flex shrink-0 items-center gap-1 text-xs leading-5 text-[#9b9fb1]",
                                                                today &&
                                                                    "text-[13px] font-semibold",
                                                            )}
                                                        >
                                                            {today && (
                                                                <span className="size-1.5 rounded-full bg-[#83889e]" />
                                                            )}
                                                            {item.time}
                                                        </span>
                                                    </div>
                                                    <p className="text-xs leading-5 tracking-[-0.5px] text-[#83889e]">
                                                        {item.description}
                                                    </p>
                                                    <div className="flex flex-wrap items-center gap-3 pt-2.5">
                                                        {item.actions.map((action, index) => (
                                                            <Button
                                                                key={action.label}
                                                                asChild
                                                                variant={
                                                                    index === 0 ? "default" : "link"
                                                                }
                                                                className={cn(
                                                                    "h-auto text-[13px] leading-5 font-semibold",
                                                                    index === 0
                                                                        ? "rounded-full px-4 py-1.5 text-white"
                                                                        : "px-0 py-0 underline",
                                                                    today
                                                                        ? index === 0
                                                                            ? "bg-[#83889e] hover:bg-[#6b6c7b]"
                                                                            : "text-[#83889e]"
                                                                        : index === 0
                                                                          ? "bg-[#6653fb]"
                                                                          : "text-[#6653fb]",
                                                                )}
                                                            >
                                                                <Link href={action.href}>
                                                                    {action.label}
                                                                </Link>
                                                            </Button>
                                                        ))}
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </section>
                            );
                        })}
                    </div>
                </div>
            </div>
        </main>
    );
}
