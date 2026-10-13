"use client";

import { type FormEvent, useId, useState } from "react";
import Image from "next/image";
import Link from "next/link";

import { Button } from "@/common/components/ui/Button";
import { Separator } from "@/common/components/ui/Separator";
import { getApiErrorMessage } from "@/common/lib/api/error";
import { formatPrice, formatSignedPercent } from "../analysis/market-analysis/formatters";

const MAX_TARGET_PRICE = 100_000_000_000;

function parsePrice(value: string) {
    const digits = value.replace(/\D/g, "");
    return digits === "" ? null : Number(digits);
}

function formatInput(value: number | null) {
    return value === null ? "" : value.toLocaleString("ko-KR");
}

/**
 * 목표 가격 카드 — 판매자 목표 판매가(비교 기준: 최근 평균 시세)와 관심상품 목표 구매가(비교 기준: 현재 가격)에 함께 쓴다.
 * 저장하면 서버가 바로 도달 여부를 확인해 알림을 만든다. 부모는 저장된 목표가가 바뀌면 입력값을 새로 채우도록 {@code key}를 바꾼다.
 */
export function TargetPriceCard({
    title,
    description,
    targetPrice,
    compareLabel,
    comparePrice,
    reached,
    reachedText,
    waitingText,
    isSaving,
    error,
    onSave,
    variant = "default",
    recommendedPrice = null,
    marketPriceDiffRate = null,
    targetPriceNotificationEnabled,
}: {
    title: string;
    description: string;
    targetPrice: number | null;
    compareLabel: string;
    comparePrice: number | null;
    reached: boolean;
    reachedText: string;
    waitingText: string;
    isSaving: boolean;
    error: unknown;
    onSave: (targetPrice: number | null) => void;
    variant?: "default" | "interest" | "management";
    recommendedPrice?: number | null;
    marketPriceDiffRate?: number | null;
    targetPriceNotificationEnabled?: boolean;
}) {
    const inputId = useId();
    const [input, setInput] = useState(formatInput(targetPrice));
    const [validation, setValidation] = useState<string | null>(null);
    const isInterestVariant = variant === "interest";
    const isManagementVariant = variant === "management";
    const parsed = parsePrice(input);
    const unchanged = parsed === targetPrice;

    const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (parsed === null || parsed <= 0) {
            setValidation("목표 가격을 0원보다 크게 입력해 주세요.");
            return;
        }
        if (parsed > MAX_TARGET_PRICE) {
            setValidation("목표 가격이 너무 커요.");
            return;
        }
        setValidation(null);
        onSave(parsed);
    };

    const handleClear = () => {
        setValidation(null);
        onSave(null);
    };

    const status =
        targetPrice === null
            ? { label: "미설정", className: "bg-[#f2f4f7] text-[#6b6c7b]" }
            : reached
              ? { label: "도달", className: "bg-[#f0edff] text-[#6653fb]" }
              : { label: "대기 중", className: "bg-[#eef4ff] text-[#3a6ff0]" };
    const message = error ? getApiErrorMessage(error) : validation;

    if (isInterestVariant || isManagementVariant) {
        const referenceLabel = isInterestVariant ? "현재 AI 추천 구매가" : compareLabel;
        const referencePrice = isInterestVariant ? recommendedPrice : comparePrice;
        const referenceColor = isInterestVariant ? "text-[#6653fb]" : "text-[#272727]";
        const referenceLabelColor = isInterestVariant ? "text-[#6653fb]" : "text-[#6b6c7b]";

        return (
            <section
                aria-label={title}
                className="rounded-[20px] border border-[#d3d3d3] bg-white p-5 shadow-[0_1px_1.5px_rgba(0,0,0,0.04)] md:p-8"
            >
                <div className="flex w-full items-start justify-between gap-4">
                    <div className="flex min-w-0 flex-1 flex-col">
                        <h3 className="text-[22px] leading-[30px] font-semibold tracking-[0.5px] text-[#363636]">
                            {title}
                        </h3>
                        <p className="text-[12px] leading-5 tracking-[-0.5px] text-[#6b6c7b]">
                            {description}
                        </p>
                    </div>
                    {targetPriceNotificationEnabled === false ? (
                        <Button
                            asChild
                            variant="ghost"
                            className="h-auto gap-2 rounded-full px-1.5 py-1 text-[#6653fb] hover:bg-[#f5f3ff] hover:text-[#6653fb] focus-visible:ring-2 focus-visible:ring-[#6653fb]/30"
                        >
                            <Link href="/my/notifications" aria-label="알림 활성화 설정으로 이동">
                                <Image
                                    src="/sell/actions/target-price-info.svg"
                                    alt=""
                                    width={20}
                                    height={20}
                                />
                                <span className="text-[13px] leading-5 font-semibold tracking-[-0.5px]">
                                    알림 활성화
                                </span>
                            </Link>
                        </Button>
                    ) : null}
                </div>

                <div className="mt-5 flex w-full items-center justify-between rounded-[10px] bg-[#fafbff] px-2.5 py-5">
                    <div className="flex min-w-0 flex-1 flex-col items-center text-center">
                        <span
                            className={`text-[12px] leading-5 tracking-[-0.5px] ${referenceLabelColor}`}
                        >
                            {referenceLabel}
                        </span>
                        <div className="flex flex-col items-center">
                            <strong
                                className={`text-[22px] leading-[30px] font-semibold tracking-[0.5px] ${referenceColor}`}
                            >
                                {formatPrice(referencePrice)}
                            </strong>
                            {isInterestVariant &&
                            marketPriceDiffRate !== null &&
                            marketPriceDiffRate !== undefined ? (
                                <span className="text-[10px] leading-[15px] tracking-[-0.5px] text-[#a9adbd]">
                                    시세 대비 {formatSignedPercent(marketPriceDiffRate)}
                                </span>
                            ) : null}
                        </div>
                    </div>
                    <Separator orientation="vertical" className="h-[52px]" />
                    <div className="flex min-w-0 flex-1 flex-col items-center text-center">
                        <span className="text-[12px] leading-5 tracking-[-0.5px] text-[#6b6c7b]">
                            목표 등록가
                        </span>
                        <strong
                            className={`text-[22px] leading-[30px] font-semibold tracking-[0.5px] ${
                                targetPrice === null ? "text-[#83889e]" : "text-[#272727]"
                            }`}
                        >
                            {targetPrice === null ? "미설정" : formatPrice(targetPrice)}
                        </strong>
                        {targetPrice !== null ? (
                            <button
                                type="button"
                                onClick={handleClear}
                                disabled={isSaving}
                                className="cursor-pointer text-[10px] leading-[15px] tracking-[-0.5px] text-[#a9adbd] underline underline-offset-2 hover:text-[#6653fb] focus-visible:ring-2 focus-visible:ring-[#6653fb]/30 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                삭제하기
                            </button>
                        ) : null}
                    </div>
                </div>

                <form
                    onSubmit={handleSubmit}
                    className="mt-5 flex w-full overflow-hidden rounded-[10px] border border-[#d3d3d3] bg-white"
                >
                    <label htmlFor={inputId} className="sr-only">
                        {title} 입력
                    </label>
                    <div className="flex min-w-0 flex-1 items-center px-5">
                        <input
                            id={inputId}
                            inputMode="numeric"
                            autoComplete="off"
                            placeholder="목표 가격 입력"
                            value={input}
                            onChange={(event) =>
                                setInput(formatInput(parsePrice(event.target.value)))
                            }
                            className="h-[52px] min-w-0 flex-1 bg-transparent text-left text-[14px] font-semibold tracking-[0.07px] text-[#272727] tabular-nums outline-none placeholder:font-normal placeholder:text-[#83889e]"
                        />
                        <span className="shrink-0 text-[14px] font-semibold tracking-[0.07px] text-[#272727]">
                            원
                        </span>
                    </div>
                    <button
                        type="submit"
                        disabled={isSaving || unchanged}
                        className="shrink-0 bg-[#6653fb] px-8 py-3 text-[16px] leading-6 font-semibold tracking-[0.08px] text-white transition-colors hover:bg-[#5745e7] focus-visible:ring-3 focus-visible:ring-[#6653fb]/30 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        저장하기
                    </button>
                </form>
                {message ? (
                    <p role="alert" className="mt-2 text-[13px] leading-5 text-[#d65353]">
                        {message}
                    </p>
                ) : null}
            </section>
        );
    }

    return (
        <section aria-label={title} className="rounded-[16px] border border-[#dee5ed] bg-white p-5">
            <div className="flex items-center justify-between gap-3">
                <h3 className="text-[16px] leading-6 font-semibold text-[#1b1d29]">{title}</h3>
                <span
                    className={`rounded-full px-3 py-1 text-[12px] leading-4 font-semibold ${status.className}`}
                >
                    {status.label}
                </span>
            </div>
            <p className="mt-1 text-[13px] leading-5 text-[#6b6c7b]">{description}</p>

            <dl className="mt-4 grid grid-cols-2 gap-3 rounded-[12px] bg-[#f8fafc] p-4">
                <div>
                    <dt className="text-[12px] leading-4 text-[#6b6c7b]">{compareLabel}</dt>
                    <dd className="mt-1 text-[15px] leading-6 font-semibold text-[#1b1d29]">
                        {comparePrice === null ? "아직 없어요" : formatPrice(comparePrice)}
                    </dd>
                </div>
                <div>
                    <dt className="text-[12px] leading-4 text-[#6b6c7b]">현재 목표가</dt>
                    <dd
                        className={`mt-1 text-[15px] leading-6 font-semibold ${
                            targetPrice === null ? "text-[#83889e]" : "text-[#1b1d29]"
                        }`}
                    >
                        {targetPrice === null ? "미설정" : formatPrice(targetPrice)}
                    </dd>
                </div>
            </dl>
            {targetPrice !== null ? (
                <p className="mt-2 text-[13px] leading-5 text-[#3b3d4a]">
                    {reached ? reachedText : waitingText}
                </p>
            ) : null}

            <form
                onSubmit={handleSubmit}
                className="mt-4 flex flex-wrap items-center gap-2 rounded-[12px] border border-[#e2ddff] bg-[#fafbff] p-3"
            >
                <label htmlFor={inputId} className="sr-only">
                    {title} 입력
                </label>
                <div className="relative min-w-[160px] flex-1">
                    <input
                        id={inputId}
                        inputMode="numeric"
                        autoComplete="off"
                        placeholder="목표 가격 입력"
                        value={input}
                        onChange={(event) => setInput(formatInput(parsePrice(event.target.value)))}
                        className="h-10 w-full rounded-[10px] border border-[#d8d2ff] bg-white px-3 pr-8 text-right text-[14px] text-[#1b1d29] tabular-nums transition-colors outline-none placeholder:text-[#9b96c8] focus:border-[#6653fb] focus:ring-3 focus:ring-[#6653fb]/15"
                    />
                    <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-[13px] text-[#6b6c7b]">
                        원
                    </span>
                </div>
                <button
                    type="submit"
                    disabled={isSaving || unchanged}
                    className="h-10 rounded-[10px] bg-[#6653fb] px-4 text-[14px] font-semibold text-white transition-colors hover:bg-[#5745e7] focus-visible:ring-3 focus-visible:ring-[#6653fb]/30 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                >
                    {targetPrice === null ? "설정" : "변경"}
                </button>
                {targetPrice !== null ? (
                    <button
                        type="button"
                        onClick={handleClear}
                        disabled={isSaving}
                        className="h-10 rounded-[10px] border border-[#e2ddff] bg-white px-4 text-[14px] font-semibold text-[#6b6c7b] transition-colors hover:border-[#6653fb] hover:bg-[#f5f3ff] hover:text-[#6653fb] focus-visible:ring-3 focus-visible:ring-[#6653fb]/30 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        해제
                    </button>
                ) : null}
            </form>
            {message ? (
                <p role="alert" className="mt-2 text-[13px] leading-5 text-[#d65353]">
                    {message}
                </p>
            ) : null}
        </section>
    );
}
