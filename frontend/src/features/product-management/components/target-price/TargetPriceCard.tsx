"use client";

import { type FormEvent, useId, useState } from "react";

import { getApiErrorMessage } from "@/common/lib/api/error";
import { formatPrice } from "../analysis/market-analysis/formatters";

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
}) {
    const inputId = useId();
    const [input, setInput] = useState(formatInput(targetPrice));
    const [validation, setValidation] = useState<string | null>(null);
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
            ? { label: "설정 안 함", className: "bg-[#f2f4f7] text-[#6b6c7b]" }
            : reached
              ? { label: "도달", className: "bg-[#fff4f4] text-[#fa503d]" }
              : { label: "대기 중", className: "bg-[#eef4ff] text-[#3a6ff0]" };
    const message = error ? getApiErrorMessage(error) : validation;

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
                    <dd className="mt-1 text-[15px] leading-6 font-semibold text-[#1b1d29]">
                        {targetPrice === null ? "—" : formatPrice(targetPrice)}
                    </dd>
                </div>
            </dl>
            {targetPrice !== null ? (
                <p className="mt-2 text-[13px] leading-5 text-[#3b3d4a]">
                    {reached ? reachedText : waitingText}
                </p>
            ) : null}

            <form onSubmit={handleSubmit} className="mt-4 flex flex-wrap items-center gap-2">
                <label htmlFor={inputId} className="sr-only">
                    {title} 입력
                </label>
                <div className="relative min-w-[160px] flex-1">
                    <input
                        id={inputId}
                        inputMode="numeric"
                        autoComplete="off"
                        placeholder="목표 가격"
                        value={input}
                        onChange={(event) => setInput(formatInput(parsePrice(event.target.value)))}
                        className="h-10 w-full rounded-[10px] border border-[#dee5ed] px-3 pr-8 text-[14px] text-[#1b1d29] outline-none focus:border-[#fa503d]"
                    />
                    <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-[13px] text-[#6b6c7b]">
                        원
                    </span>
                </div>
                <button
                    type="submit"
                    disabled={isSaving || unchanged}
                    className="h-10 rounded-[10px] bg-[#fa503d] px-4 text-[14px] font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
                >
                    {targetPrice === null ? "설정" : "변경"}
                </button>
                {targetPrice !== null ? (
                    <button
                        type="button"
                        onClick={handleClear}
                        disabled={isSaving}
                        className="h-10 rounded-[10px] border border-[#dee5ed] px-4 text-[14px] font-semibold text-[#3b3d4a] disabled:cursor-not-allowed disabled:opacity-50"
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
