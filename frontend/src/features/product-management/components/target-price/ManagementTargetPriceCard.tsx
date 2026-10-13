"use client";

import Image from "next/image";
import Link from "next/link";

import { Button } from "@/common/components/ui/Button";
import { Separator } from "@/common/components/ui/Separator";
import { formatPrice } from "../analysis/market-analysis/formatters";
import { useTargetPriceInput } from "./useTargetPriceInput";

type TargetPriceReference = {
    label: string;
    price: number | null;
    emphasized?: boolean;
    supportingText?: string | null;
};

export function ManagementTargetPriceCard({
    title,
    description,
    targetPrice,
    reference,
    isSaving,
    error,
    onSave,
    targetPriceNotificationEnabled,
}: {
    title: string;
    description: string;
    targetPrice: number | null;
    reference: TargetPriceReference;
    isSaving: boolean;
    error: unknown;
    onSave: (targetPrice: number | null) => void;
    targetPriceNotificationEnabled?: boolean;
}) {
    const { inputId, input, unchanged, message, handleInputChange, handleSubmit, handleClear } =
        useTargetPriceInput({ targetPrice, error, onSave });
    const referenceColor = reference.emphasized ? "text-[#6653fb]" : "text-[#272727]";
    const referenceLabelColor = reference.emphasized ? "text-[#6653fb]" : "text-[#6b6c7b]";

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
                        {reference.label}
                    </span>
                    <div className="flex flex-col items-center">
                        <strong
                            className={`text-[22px] leading-[30px] font-semibold tracking-[0.5px] ${referenceColor}`}
                        >
                            {formatPrice(reference.price)}
                        </strong>
                        {reference.supportingText ? (
                            <span className="text-[10px] leading-[15px] tracking-[-0.5px] text-[#a9adbd]">
                                {reference.supportingText}
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
                        onChange={handleInputChange}
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
