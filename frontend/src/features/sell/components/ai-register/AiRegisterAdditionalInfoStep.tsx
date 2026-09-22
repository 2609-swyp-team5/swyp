"use client";

import type { ReactNode } from "react";

import { cn } from "@/common/lib/utils";
import {
    IncludedItemsField,
    type IncludedItemOption,
} from "@/features/sell/components/shared/IncludedItemsField";

export type AiPurchasePeriod = "1" | "2" | "3" | "4" | "5" | "6" | "unknown";

export type AiOperationStatus = "normal" | "issues" | "unknown";

export type AiIncludedItem = string;

type AiRegisterAdditionalInfoStepProps = {
    purchasePeriod: AiPurchasePeriod;
    operationStatus: AiOperationStatus;
    includedItems: AiIncludedItem[];
    onPurchasePeriodChange: (value: AiPurchasePeriod) => void;
    onOperationStatusChange: (value: AiOperationStatus) => void;
    onIncludedItemChange: (value: AiIncludedItem, checked: boolean) => void;
    children: ReactNode;
};

const purchasePeriodOptions: { value: AiPurchasePeriod; label: string }[] = [
    { value: "1", label: "1개월 이내" },
    { value: "2", label: "2개월 이내" },
    { value: "3", label: "3개월 이내" },
    { value: "4", label: "4개월 이내" },
    { value: "5", label: "5개월 이내" },
    { value: "6", label: "6개월 이내" },
    { value: "unknown", label: "잘 모르겠어요" },
];

const operationStatusOptions: { value: AiOperationStatus; label: string }[] = [
    { value: "normal", label: "모든 기능 정상" },
    { value: "issues", label: "일부 문제 있음" },
    { value: "unknown", label: "확인하지 못했어요" },
];

const includedItemOptions: IncludedItemOption[] = [
    { value: "body", label: "본체" },
    { value: "charging-cable", label: "충전 케이블" },
    { value: "box", label: "박스" },
    { value: "manual", label: "설명서" },
    { value: "strap", label: "스트랩" },
];

function ChoiceButton({
    label,
    selected,
    onClick,
}: {
    label: string;
    selected: boolean;
    onClick: () => void;
}) {
    return (
        <button
            type="button"
            role="radio"
            aria-checked={selected}
            className={cn(
                "h-10 rounded-full border-[1.5px] px-4 py-2 text-[16px] leading-[25px] font-semibold tracking-[0.5px] transition-colors focus-visible:ring-3 focus-visible:ring-[#6653fb]/30 focus-visible:outline-none",
                selected
                    ? "border-[#6653fb] bg-[#fafbff] text-[#6653fb]"
                    : "border-[#d3d3d3] bg-white text-[#6b6c7b] hover:border-[#6653fb]",
            )}
            onClick={onClick}
        >
            {label}
        </button>
    );
}

export function AiRegisterAdditionalInfoStep({
    purchasePeriod,
    operationStatus,
    includedItems,
    onPurchasePeriodChange,
    onOperationStatusChange,
    onIncludedItemChange,
    children,
}: AiRegisterAdditionalInfoStepProps) {
    return (
        <div className="flex w-full flex-col">
            <section className="flex w-full flex-col gap-10 rounded-[20px] border border-[#d3d3d3] bg-white px-6 pt-[50px] pb-[60px] lg:px-[60px]">
                <div className="flex flex-col gap-3">
                    <h2 className="text-[20px] leading-[30px] font-semibold tracking-[0.5px] text-[#6b6c7b]">
                        구매 시기는 언제인가요?
                    </h2>
                    <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="구매 시기">
                        {purchasePeriodOptions.map((option) => (
                            <ChoiceButton
                                key={option.value}
                                label={option.label}
                                selected={purchasePeriod === option.value}
                                onClick={() => onPurchasePeriodChange(option.value)}
                            />
                        ))}
                    </div>
                </div>

                <div className="flex flex-col gap-3">
                    <h2 className="text-[20px] leading-[30px] font-semibold tracking-[0.5px] text-[#6b6c7b]">
                        정상적으로 작동하나요?
                    </h2>
                    <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="작동 상태">
                        {operationStatusOptions.map((option) => (
                            <ChoiceButton
                                key={option.value}
                                label={option.label}
                                selected={operationStatus === option.value}
                                onClick={() => onOperationStatusChange(option.value)}
                            />
                        ))}
                    </div>
                </div>

                <div className="flex flex-col gap-3">
                    <p className="typography-heading-03 text-[20px] leading-[30px] font-semibold tracking-[0.5px] text-[#6b6c7b]">
                        구성품은 무엇이 있나요?
                    </p>
                    <IncludedItemsField
                        items={includedItems}
                        options={includedItemOptions}
                        onChange={onIncludedItemChange}
                        ariaLabel="구성품"
                    />
                </div>
            </section>

            {children}
        </div>
    );
}
