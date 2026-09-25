"use client";

import Link from "next/link";

import { Button } from "@/common/components/ui/Button";
import { MyPageContent, MyPanel } from "@/features/my/components/MyPageContent";
import { useMeQuery } from "@/features/member/hooks/queries/useMeQuery";

const summaries = [
    { title: "등록한 물건", value: "6개", description: "판매 중 3 · 관심 2 · 완료 1" },
    { title: "AI 추천 알림", value: "2건", description: "오늘 새로 분석한 타이밍" },
    { title: "평균 시세 대비", value: "+4.1%", description: "내 물건들의 전체 시세 평균" },
    { title: "최근 분석일", value: "오늘", description: "2026년 9월 9일 오전 9:12" },
];
const connectionAlerts = [
    { platform: "번개장터", message: "번개장터의 로그인이 만료됐어요.", time: "2시간 전" },
    { platform: "중고나라", message: "중고나라의 세션이 만료됐어요.", time: "3시간 전" },
    { platform: "당근마켓", message: "당근마켓의 로그인이 만료됐어요.", time: "5시간 전" },
];

export default function MyPage() {
    const { data: member, isError, isFetching, refetch } = useMeQuery();

    return (
        <MyPageContent
            eyebrow="AI와 함께하는 똑똑한 중고거래"
            title={member ? `안녕하세요, ${member.nickname}님 👋` : "안녕하세요 👋"}
        >
            {isError ? (
                <div className="mb-6 flex items-center gap-3">
                    <p role="alert" className="text-muted-foreground text-[13px]">
                        회원정보를 불러오지 못했습니다.
                    </p>
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={isFetching}
                        onClick={() => void refetch()}
                    >
                        다시 시도
                    </Button>
                </div>
            ) : null}
            <div className="grid gap-3 sm:grid-cols-2">
                {summaries.map((item) => (
                    <MyPanel key={item.title} className="min-h-[140px] justify-between gap-3">
                        <div>
                            <h2 className="text-[13px] leading-5 font-semibold">{item.title}</h2>
                            <p className="typography-heading-03 text-primary leading-[42px] font-bold">
                                {item.value}
                            </p>
                        </div>
                        <p className="font-normal">{item.description}</p>
                    </MyPanel>
                ))}
            </div>
            <section aria-labelledby="connection-alerts-title" className="mt-[50px]">
                <h2
                    id="connection-alerts-title"
                    className="mb-4 text-base leading-[25px] font-semibold"
                >
                    연결 알림 <span className="text-muted-foreground ml-2 font-normal">3건</span>
                </h2>
                <div className="grid gap-5 xl:grid-cols-3">
                    {connectionAlerts.map((item) => (
                        <MyPanel
                            key={item.platform}
                            className="before:from-primary before:to-primary/40 relative gap-3 p-5 before:absolute before:inset-x-0 before:top-0 before:h-1 before:bg-gradient-to-r"
                        >
                            <div className="flex items-start justify-between gap-2">
                                <h3 className="text-[13px] leading-5 font-semibold">
                                    {item.message}
                                </h3>
                                <span className="text-muted-foreground shrink-0 text-xs leading-5">
                                    {item.time}
                                </span>
                            </div>
                            <p className="text-muted-foreground text-[13px] leading-5">
                                판매 상태 동기화를 위해 다시 연결해 주세요.
                            </p>
                            <Button
                                asChild
                                variant="outline"
                                className="border-primary text-primary mt-auto w-fit rounded-full text-[13px]"
                            >
                                <Link
                                    href="/my/platforms"
                                    aria-label={`${item.platform} 다시 연결`}
                                >
                                    다시 연결
                                </Link>
                            </Button>
                        </MyPanel>
                    ))}
                </div>
            </section>
        </MyPageContent>
    );
}
