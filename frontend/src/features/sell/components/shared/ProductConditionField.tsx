"use client";

import { cn } from "@/common/lib/utils";
import type { ProductCondition } from "@/features/sell/types";

export const productConditionOptions: {
    value: ProductCondition;
    label: string;
    description: string;
}[] = [
    { value: "S", label: "미개봉", description: "포장을 개봉하지 않은 새 상품" },
    { value: "A", label: "거의 새 상품", description: "사용 흔적이 거의 없음" },
    { value: "B", label: "사용감 적음", description: "작은 사용 흔적이 있음" },
    { value: "C", label: "사용감 있음", description: "스크래치나 사용 흔적이 확인됨" },
    { value: "D", label: "수리 필요", description: "일부 기능에 문제가 있음" },
];

type ProductConditionFieldProps = {
    value: ProductCondition | null;
    onChange: (value: ProductCondition) => void;
    ariaLabel?: string;
};

export function ProductConditionField({
    value,
    onChange,
    ariaLabel = "상품 상태",
}: ProductConditionFieldProps) {
    return (
        <div
            className="grid gap-5 sm:grid-cols-2 lg:grid-cols-5"
            role="radiogroup"
            aria-label={ariaLabel}
            aria-required="true"
        >
            {productConditionOptions.map((option) => {
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
