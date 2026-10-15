"use client";

import { useTargetPriceInput } from "./useTargetPriceInput";
import { formatPrice } from "../analysis/market-analysis/formatters";

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
    const { inputId, input, unchanged, message, handleInputChange, handleSubmit, handleClear } =
        useTargetPriceInput({ targetPrice, error, onSave });
    const status =
        targetPrice === null
            ? { label: "미설정", className: "bg-[#f2f4f7] text-[#6b6c7b]" }
            : reached
              ? { label: "도달", className: "bg-[#f0edff] text-[#6653fb]" }
              : { label: "대기 중", className: "bg-[#eef4ff] text-[#3a6ff0]" };

    return (
        <section aria-label={title} className="rounded-[16px] border border-[#dee5ed] bg-white p-5">
            <div className="flex items-center justify-between gap-3">
                <h3 className="typography-body-bold font-semibold text-[#1b1d29]">{title}</h3>
                <span
                    className={`typography-body-small rounded-full px-3 py-1 font-semibold ${status.className}`}
                >
                    {status.label}
                </span>
            </div>
            <p className="typography-body-small mt-1 text-[#6b6c7b]">{description}</p>

            <dl className="mt-4 grid grid-cols-2 gap-3 rounded-[12px] bg-[#f8fafc] p-4">
                <div>
                    <dt className="typography-body-small text-[#6b6c7b]">{compareLabel}</dt>
                    <dd className="typography-body-bold mt-1 font-semibold text-[#1b1d29]">
                        {comparePrice === null ? "아직 없어요" : formatPrice(comparePrice)}
                    </dd>
                </div>
                <div>
                    <dt className="typography-body-small text-[#6b6c7b]">현재 목표가</dt>
                    <dd
                        className={`typography-body-bold mt-1 font-semibold ${
                            targetPrice === null ? "text-[#83889e]" : "text-[#1b1d29]"
                        }`}
                    >
                        {targetPrice === null ? "미설정" : formatPrice(targetPrice)}
                    </dd>
                </div>
            </dl>
            {targetPrice !== null ? (
                <p className="typography-body-small mt-2 text-[#3b3d4a]">
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
                        onChange={handleInputChange}
                        className="typography-body-small h-10 w-full rounded-[10px] border border-[#d8d2ff] bg-white px-3 pr-8 text-right text-[#1b1d29] tabular-nums transition-colors outline-none placeholder:text-[#9b96c8] focus:border-[#6653fb] focus:ring-3 focus:ring-[#6653fb]/15"
                    />
                    <span className="typography-body-small pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-[#6b6c7b]">
                        원
                    </span>
                </div>
                <button
                    type="submit"
                    disabled={isSaving || unchanged}
                    className="typography-body-bold-small h-10 rounded-[10px] bg-[#6653fb] px-4 font-semibold text-white transition-colors hover:bg-[#5745e7] focus-visible:ring-3 focus-visible:ring-[#6653fb]/30 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                >
                    {targetPrice === null ? "설정" : "변경"}
                </button>
                {targetPrice !== null ? (
                    <button
                        type="button"
                        onClick={handleClear}
                        disabled={isSaving}
                        className="typography-body-bold-small h-10 rounded-[10px] border border-[#e2ddff] bg-white px-4 font-semibold text-[#6b6c7b] transition-colors hover:border-[#6653fb] hover:bg-[#f5f3ff] hover:text-[#6653fb] focus-visible:ring-3 focus-visible:ring-[#6653fb]/30 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        해제
                    </button>
                ) : null}
            </form>
            {message ? (
                <p role="alert" className="typography-body-small mt-2 text-[#d65353]">
                    {message}
                </p>
            ) : null}
        </section>
    );
}
