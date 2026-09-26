"use client";

import Image from "next/image";
import Link from "next/link";

import { Button } from "@/common/components/ui/Button";
import { useMeQuery } from "@/features/member/hooks/queries/useMeQuery";

const summaries = [
    { title: "등록한 물건", value: "6개", description: "판매 중 3 · 예약2 · 완료 1" },
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
        <main className="text-foreground min-w-0 bg-white px-6 py-12 text-base leading-[25px] font-normal break-keep sm:px-10 lg:py-[60px] xl:px-[min(7vw,var(--grid-margin))]">
            <div className="mx-auto flex w-full max-w-[960px] flex-col gap-[10px]">
                <header className="flex flex-col-reverse items-center justify-between gap-5 py-5 text-center sm:flex-row sm:px-10 sm:text-left">
                    <div className="break-keep">
                        <p className="text-[20px] leading-8 font-medium tracking-[0.5px] text-[#8ca2c0]">
                            AI와 함께하는 똑똑한 중고거래
                        </p>
                        <h1 className="mt-[5px] text-[30px] leading-[42px] font-bold tracking-[0.5px] text-[#363636]">
                            {member ? `안녕하세요, ${member.nickname}님` : "안녕하세요"}
                        </h1>
                    </div>
                    <div className="relative h-[237px] w-[267px] shrink-0 overflow-hidden">
                        <Image
                            src="/my/mascot.png"
                            alt=""
                            width={282}
                            height={282}
                            priority
                            className="absolute -top-[12px] left-[5px] max-w-none -scale-x-100"
                        />
                    </div>
                </header>

                {isError ? (
                    <div className="flex items-center gap-3 px-1">
                        <p role="alert" className="text-[13px] text-[#6b7395]">
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

                <section aria-label="거래 요약" className="grid gap-[10px] sm:grid-cols-2">
                    {summaries.map((item) => (
                        <article
                            key={item.title}
                            className="flex min-h-[158px] flex-col justify-between rounded-[10px] border border-[#d3d3d3] bg-white p-6"
                        >
                            <div>
                                <h2 className="text-[13px] leading-5 font-semibold tracking-[-0.5px] text-[#464646]">
                                    {item.title}
                                </h2>
                                <p className="text-[30px] leading-[42px] font-bold tracking-[0.5px] text-[#6653fb]">
                                    {item.value}
                                </p>
                            </div>
                            <p className="text-base leading-[25px] text-[#464646]">
                                {item.description}
                            </p>
                        </article>
                    ))}
                </section>

                <section aria-labelledby="connection-alerts-title" className="my-[50px]">
                    <h2
                        id="connection-alerts-title"
                        className="mb-[10px] text-[20px] leading-[30px] font-semibold tracking-[0.5px] text-[#545d82]"
                    >
                        연결 알림
                        <span className="ml-[10px] text-base font-normal text-[#8ca2c0]">3건</span>
                    </h2>
                    <div className="grid gap-[30px] lg:grid-cols-3">
                        {connectionAlerts.map((item) => (
                            <article
                                key={item.platform}
                                className="flex min-h-[166px] flex-col items-start rounded-[16px] border border-[#eef0f6] bg-white p-5 shadow-[0_1px_4px_rgba(0,0,0,0.04)]"
                            >
                                <div className="flex w-full items-start justify-between gap-1">
                                    <h3 className="min-w-0 text-[13px] leading-[19.5px] font-semibold tracking-[-0.5px] text-[#545d82]">
                                        {item.message}
                                    </h3>
                                    <span className="shrink-0 text-[11px] leading-[17px] text-[#8ca2c0]">
                                        {item.time}
                                    </span>
                                </div>
                                <p className="mt-[8px] text-[12px] leading-[18px] text-[#6b7395]">
                                    판매 상태 동기화를 위해 다시 연결해 주세요.
                                </p>
                                <Button
                                    asChild
                                    variant="outline"
                                    className="mt-auto h-8 rounded-full border-[#5d55fe] px-4 text-[12px] text-[#5d55fe]"
                                >
                                    <Link
                                        href="/my/platforms"
                                        aria-label={`${item.platform} 다시 연결`}
                                    >
                                        다시 연결
                                    </Link>
                                </Button>
                            </article>
                        ))}
                    </div>
                </section>
            </div>
        </main>
    );
}
