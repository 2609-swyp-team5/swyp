"use client";

import Link from "next/link";
import { BellRing, ChevronRight, Search } from "lucide-react";
import { useState, type FormEvent } from "react";

import { getApiErrorMessage } from "@/common/lib/api/error";
import { getNotificationLink } from "@/features/notifications/utils/notificationDisplay";

import { useAiTimingAlertsQuery } from "../hooks/queries/useAiTimingAlertsQuery";
import { AiChatSuggestionChips } from "./AiChatSuggestionChips";

/** 지금이니 AI 첫 화면 — 질문 입력, 추천 질문, 최근 대화 바로가기, AI 타이밍 알림. */
export function AiChatHome({
    chatCount,
    onAsk,
    onOpenList,
}: {
    chatCount: number;
    onAsk: (question: string) => void;
    onOpenList: () => void;
}) {
    const [value, setValue] = useState("");
    const alerts = useAiTimingAlertsQuery();
    const submit = (event: FormEvent) => {
        event.preventDefault();
        if (value.trim()) {
            onAsk(value);
        }
    };

    return (
        <main className="flex flex-1 flex-col bg-gradient-to-b from-white to-[#dad5ff]">
            <div className="layout-container flex flex-col items-center gap-12 py-12 md:gap-20 md:py-[120px] lg:py-[160px]">
                <section className="flex w-full flex-col items-center gap-6 md:gap-10">
                    <div className="flex flex-col items-center gap-2.5 text-center">
                        <h1 className="typography-heading-01 text-[#545d82]">지금이니 AI</h1>
                        <p className="typography-heading-03 break-keep text-[#6b7395]">
                            자연어로 물어보세요. AI가 시세 분석과 거래 타이밍을 종합해 알려드려요.
                        </p>
                    </div>
                    <div className="flex w-full flex-col items-center gap-4">
                        <form onSubmit={submit} className="relative w-full max-w-[1166px]">
                            <input
                                value={value}
                                maxLength={500}
                                aria-label="AI에게 질문하기"
                                onChange={(event) => setValue(event.target.value)}
                                placeholder="예: 필름카메라 지금 팔아도 될까요?"
                                className="typography-body-large h-14 w-full rounded-[50px] border border-white bg-[#fafbff] pr-16 pl-5 text-[#363636] shadow-[0_4px_16px_rgba(54,51,100,0.08)] outline-none placeholder:text-[#6b6c7b] focus-visible:border-[#6653fb] md:h-[70px] md:pr-[90px] md:pl-[50px]"
                            />
                            <button
                                type="submit"
                                aria-label="질문하기"
                                disabled={!value.trim()}
                                className="absolute top-1/2 right-1.5 flex size-11 -translate-y-1/2 items-center justify-center rounded-full bg-[#6653fb] text-white disabled:opacity-60 md:right-2 md:size-[60px]"
                            >
                                <Search aria-hidden="true" className="size-5 md:size-6" />
                            </button>
                        </form>
                        <AiChatSuggestionChips onAsk={onAsk} />
                        {chatCount > 0 ? (
                            <button
                                type="button"
                                onClick={onOpenList}
                                className="typography-body-bold-small text-[#6653fb] underline underline-offset-2"
                            >
                                최근 대화 {chatCount}개 보기
                            </button>
                        ) : null}
                    </div>
                </section>

                <section
                    aria-labelledby="ai-timing-alerts-title"
                    className="flex w-full flex-col gap-4 md:gap-6"
                >
                    <div className="flex items-center justify-between text-[#464646]">
                        <h2 id="ai-timing-alerts-title" className="typography-heading-bold">
                            AI 타이밍 알림
                        </h2>
                        <Link
                            href="/notifications"
                            className="typography-body-small flex items-center gap-0.5 hover:text-[#6653fb]"
                        >
                            전체 보기
                            <ChevronRight aria-hidden="true" className="size-3.5" />
                        </Link>
                    </div>
                    <div className="flex flex-col gap-3">
                        {alerts.isPending ? (
                            <p role="status" className="typography-body-small text-[#6b7395]">
                                알림을 불러오는 중이에요.
                            </p>
                        ) : alerts.isError ? (
                            <p role="alert" className="typography-body-small text-[#6b7395]">
                                {getApiErrorMessage(alerts.error)}
                            </p>
                        ) : alerts.data.length === 0 ? (
                            <p className="typography-body-small text-[#6b7395]">
                                아직 판매·구매 추천 알림이 없어요.
                            </p>
                        ) : (
                            alerts.data.map((item) => {
                                const link = getNotificationLink(item);
                                return (
                                    <Link
                                        key={item.notificationId}
                                        href={link?.href ?? "/notifications"}
                                        className="flex gap-3 rounded-[10px] border border-transparent bg-white/40 px-4 py-3 transition-colors hover:border-[rgba(93,85,254,0.19)] md:px-5 md:py-4"
                                    >
                                        <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-[#5d55fe] text-white">
                                            <BellRing aria-hidden="true" className="size-3" />
                                        </span>
                                        <span className="flex min-w-0 flex-col">
                                            <span className="typography-body-bold text-[#545d82]">
                                                {item.title}
                                            </span>
                                            <span className="typography-body-small pt-0.5 break-keep text-[#6b7395]">
                                                {item.message}
                                            </span>
                                        </span>
                                    </Link>
                                );
                            })
                        )}
                    </div>
                </section>
            </div>
        </main>
    );
}
