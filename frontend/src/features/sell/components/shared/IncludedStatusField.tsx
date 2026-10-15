"use client";

import { cn } from "@/common/lib/utils";

export type IncludedStatus = "none" | "partial" | "all";

export const includedStatusOptions: {
    value: IncludedStatus;
    label: string;
    description: string;
}[] = [
    { value: "none", label: "없음", description: "구매 시 포함되어 있던 구성품이 없는 상태" },
    {
        value: "partial",
        label: "일부 포함",
        description: "구매 시 포함되어 있던 구성품이 일부만 있는 상태",
    },
    {
        value: "all",
        label: "전체 포함",
        description: "구매 시 포함되어 있던 모든 구성품이 있는 상태",
    },
];

export const includedStatusLabels: Record<IncludedStatus, string> = {
    none: "없음",
    partial: "일부 포함",
    all: "전체 포함",
};

export const includedStatusApiValues: Record<IncludedStatus, "NONE" | "PARTIAL" | "ALL"> = {
    none: "NONE",
    partial: "PARTIAL",
    all: "ALL",
};

type IncludedStatusFieldProps = {
    value: IncludedStatus | null;
    onChange: (value: IncludedStatus) => void;
    ariaLabel?: string;
};

export function IncludedStatusField({
    value,
    onChange,
    ariaLabel = "구성품",
}: IncludedStatusFieldProps) {
    return (
        <div
            className="grid gap-3 sm:grid-cols-3"
            role="radiogroup"
            aria-label={ariaLabel}
            aria-required="true"
        >
            {includedStatusOptions.map((option) => {
                const selected = value === option.value;

                return (
                    <button
                        key={option.value}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        aria-label={option.label}
                        className={cn(
                            "min-h-[65px] rounded-lg border-[1.5px] px-3 py-2 text-left transition-colors focus-visible:ring-3 focus-visible:ring-[#6653fb]/30 focus-visible:outline-none",
                            selected
                                ? "border-[#6653fb] bg-[#fafbff] text-[#6653fb]"
                                : "border-[#d3d3d3] bg-white text-[#6b6c7b] hover:border-[#6653fb]",
                        )}
                        onClick={() => onChange(option.value)}
                    >
                        <span className="flex flex-col items-start gap-1">
                            <span className="text-[13px] leading-5 font-semibold">
                                {option.label}
                            </span>
                            <span className="text-[10px] leading-[15px] font-normal">
                                {option.description}
                            </span>
                        </span>
                    </button>
                );
            })}
        </div>
    );
}
