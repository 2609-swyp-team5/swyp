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
    {
        platform: "번개장터",
        icon: "/my/home/bunjang.svg",
        message: "번개장터의 로그인이 만료됐어요.",
        time: "2시간 전",
    },
    {
        platform: "당근마켓",
        icon: "/my/home/daangn.svg",
        message: "당근마켓의 로그인이 만료됐어요.",
        time: "5시간 전",
    },
    {
        platform: "중고나라",
        icon: "/my/home/joonggonara.png",
        message: "중고나라의 로그인이 만료됐어요.",
        time: "2시간 전",
    },
];

export default function MyPage() {
    const { data: member, isError, isFetching, refetch } = useMeQuery();

    return (
        <main className="min-w-0 flex-1 bg-white text-[#464646]">
            <div className="bg-gradient-to-b from-[#ededfd] to-white px-6 pt-12 pb-[50px] sm:px-10 xl:px-[100px] xl:pt-[70px]">
                <header className="flex flex-col-reverse items-center gap-[30px] px-[10px] text-center sm:flex-row sm:items-end sm:text-left">
                    <div className="min-w-0 break-keep">
                        <p className="text-[20px] leading-[30px] font-semibold tracking-[0.5px] text-[#83889e]">
                            AI와 함께하는 똑똑한 중고거래
                        </p>
                        <h1 className="mt-[10px] text-[32px] leading-tight font-bold tracking-[0.5px] text-[#464646] lg:text-[42px] xl:text-[53px] xl:leading-[75px]">
                            {member ? `안녕하세요, ${member.nickname}님` : "안녕하세요"}
                        </h1>
                    </div>
                    <div className="relative h-[199px] w-[235px] shrink-0 overflow-hidden">
                        <Image
                            src="/my/mascot.png"
                            alt=""
                            width={248}
                            height={248}
                            priority
                            className="absolute -top-[14px] -left-[13px] max-w-none -scale-x-100"
                        />
                    </div>
                </header>

                {isError ? (
                    <div className="mt-6 flex items-center gap-3 px-[10px]">
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

                <section
                    aria-label="거래 요약"
                    className="mt-[60px] grid gap-[10px] sm:grid-cols-2"
                >
                    {summaries.map((item) => (
                        <article
                            key={item.title}
                            className="flex flex-col justify-between gap-3 rounded-[10px] border border-[#d3d3d3] bg-white p-6"
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
            </div>

            <section
                aria-labelledby="connection-alerts-title"
                className="mt-10 px-6 pt-[30px] pb-[100px] sm:px-10 xl:px-[100px]"
            >
                <div className="mb-[30px] flex items-center gap-[11px]">
                    <div className="flex flex-col items-start gap-[5px]">
                        <Image src="/my/home/connection-bell.svg" alt="" width={29} height={29} />
                        <span className="text-[16px] leading-[25px] text-[#d3d3d3]">3건</span>
                    </div>
                    <h2
                        id="connection-alerts-title"
                        className="text-[20px] leading-[30px] font-semibold tracking-[0.5px] text-[#545d82]"
                    >
                        연결 알림을
                        <br />
                        확인해주세요
                    </h2>
                </div>
                <div className="grid gap-[10px] sm:grid-cols-2 xl:grid-cols-3">
                    {connectionAlerts.map((item) => (
                        <article
                            key={item.platform}
                            className="flex min-h-[154px] min-w-0 flex-col rounded-[10px] border border-[#dedee6] bg-white px-5 pt-5 pb-[15px]"
                        >
                            <div className="flex min-w-0 items-center gap-[10px]">
                                <Image
                                    src={item.icon}
                                    alt=""
                                    width={37}
                                    height={37}
                                    className="size-[37px] shrink-0 rounded-[8px]"
                                />
                                <div className="min-w-0">
                                    <h3 className="text-[13px] leading-[20px] font-semibold tracking-[-0.5px] text-[#6b6c7b]">
                                        {item.message}
                                    </h3>
                                    <p className="text-[10px] leading-[15px] text-[#83889e]">
                                        {item.time}
                                    </p>
                                </div>
                            </div>
                            <p className="mt-[18px] text-[10px] leading-[15px] tracking-[-0.5px] text-[#83889e]">
                                판매 상태 동기화를 위해
                                <br />
                                다시 연결해 주세요.
                            </p>
                            <Button
                                asChild
                                variant="outline"
                                className="mt-auto h-auto self-end rounded-full border-[#6b6c7b] px-[10px] py-[3px] text-[10px] leading-[15px] text-[#6b6c7b]"
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
        </main>
    );
}
