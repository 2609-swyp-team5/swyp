"use client";

import type { ReactNode } from "react";

import { Checkbox } from "@/common/components/ui/Checkbox";
import { Input } from "@/common/components/ui/Input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/common/components/ui/Select";
import { cn } from "@/common/lib/utils";
import {
    IncludedStatusField,
    type IncludedStatus,
} from "@/features/sell/components/shared/IncludedStatusField";
import { IncludedItemsField } from "@/features/sell/components/shared/IncludedItemsField";
import { ProductConditionField } from "@/features/sell/components/shared/ProductConditionField";
import { TradeMethodField } from "@/features/sell/components/shared/TradeMethodField";
import {
    FieldError,
    FieldLabel,
    FieldLegend,
} from "@/features/sell/components/direct-register/DirectRegisterFields";
import type {
    DirectDefectStatus,
    DirectDeliveryType,
    DirectIncludedItem,
    DirectProductCondition,
    DirectPurchasePeriod,
    DirectStatusPriceErrors,
    DirectStatusPriceState,
    DirectTradeMethod,
} from "./types";

type DirectStatusPriceStepProps = DirectStatusPriceState & {
    errors: DirectStatusPriceErrors;
    onProductConditionChange: (value: DirectProductCondition) => void;
    onPurchasePeriodChange?: (value: DirectPurchasePeriod) => void;
    onIncludedItemChange: (value: DirectIncludedItem, checked: boolean) => void;
    onDefectStatusChange?: (value: DirectDefectStatus) => void;
    includedStatus?: IncludedStatus;
    onIncludedStatusChange?: (value: IncludedStatus) => void;
    onPriceChange: (value: string) => void;
    onAllowPriceProposalChange: (checked: boolean) => void;
    onTradeMethodChange: (value: DirectTradeMethod) => void;
    onDeliveryTypeChange: (value: Exclude<DirectDeliveryType, null>) => void;
    onDeliveryFeeChange?: (value: string) => void;
    onTradeLocationChange: (value: string) => void;
};

const purchasePeriodOptions: { value: DirectPurchasePeriod; label: string }[] = [
    { value: "0", label: "구매 직후" },
    { value: "1", label: "1개월 이내" },
    { value: "2", label: "2개월 이내" },
    { value: "3", label: "3개월 이내" },
    { value: "4", label: "4개월 이내" },
    { value: "5", label: "5개월 이내" },
    { value: "6", label: "6개월 이내" },
    { value: "unknown", label: "잘 모르겠어요" },
];

function formatPrice(value: string) {
    const digits = value.replace(/\D/g, "");

    return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function ChoiceButton({
    label,
    selected,
    onClick,
    className,
}: {
    label: ReactNode;
    selected: boolean;
    onClick: () => void;
    className?: string;
}) {
    return (
        <button
            type="button"
            role="radio"
            aria-checked={selected}
            className={cn(
                "typography-body-bold h-10 rounded-full border-[1.5px] px-4 py-2 font-semibold transition-colors focus-visible:ring-3 focus-visible:ring-[#6653fb]/30 focus-visible:outline-none",
                selected
                    ? "border-[#6653fb] bg-[#fafbff] text-[#6653fb]"
                    : "border-[#d3d3d3] bg-white text-[#6b6c7b] hover:border-[#6653fb]",
                className,
            )}
            onClick={onClick}
        >
            {label}
        </button>
    );
}

export function DirectStatusPriceStep({
    productCondition,
    purchasePeriod,
    includedItems,
    defectStatus,
    price,
    allowPriceProposal,
    tradeMethod,
    deliveryType,
    deliveryFee = "",
    tradeLocation,
    errors,
    onProductConditionChange,
    onPurchasePeriodChange,
    onIncludedItemChange,
    onDefectStatusChange,
    includedStatus,
    onIncludedStatusChange,
    onPriceChange,
    onAllowPriceProposalChange,
    onTradeMethodChange,
    onDeliveryTypeChange,
    onDeliveryFeeChange,
    onTradeLocationChange,
}: DirectStatusPriceStepProps) {
    const fieldClassName =
        "h-[50px] rounded-[8px] border border-[#d3d3d3] bg-[#fafbff] px-4 py-3 typography-body-medium text-[#6b6c7b] shadow-none placeholder:text-[#d3d3d3] focus-visible:border-[#6653fb] focus-visible:ring-0";

    return (
        <div className="flex w-full max-w-[1144px] flex-col gap-8">
            <section className="flex flex-col gap-6 rounded-xl border border-[#dee5ed] bg-white p-4 md:gap-7 md:p-8">
                <fieldset>
                    <FieldLegend required>상품 상태</FieldLegend>
                    <div className="mt-2.5">
                        <ProductConditionField
                            value={productCondition}
                            onChange={onProductConditionChange}
                        />
                    </div>
                </fieldset>

                {includedStatus && onIncludedStatusChange ? (
                    <fieldset>
                        <FieldLegend required>구성품</FieldLegend>
                        <div className="mt-2.5">
                            <IncludedStatusField
                                value={includedStatus}
                                onChange={onIncludedStatusChange}
                            />
                        </div>
                    </fieldset>
                ) : (
                    <div className="grid gap-6 lg:grid-cols-2">
                        <div className="flex flex-col gap-2.5">
                            <FieldLabel htmlFor="direct-purchase-period">구매 시기</FieldLabel>
                            <Select
                                value={purchasePeriod}
                                onValueChange={(value) =>
                                    onPurchasePeriodChange?.(value as DirectPurchasePeriod)
                                }
                            >
                                <SelectTrigger
                                    id="direct-purchase-period"
                                    aria-label="구매 시기"
                                    className={`${fieldClassName} w-full justify-between`}
                                >
                                    <SelectValue placeholder="구매 시기 선택" />
                                </SelectTrigger>
                                <SelectContent
                                    position="popper"
                                    className="!w-[var(--radix-select-trigger-width)] !bg-white !text-[#6b6c7b]"
                                >
                                    {purchasePeriodOptions.map((option) => (
                                        <SelectItem key={option.value} value={option.value}>
                                            {option.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <fieldset>
                            <FieldLegend className="flex items-center gap-2">
                                구성품
                                <span className="typography-caption leading-[15px] font-normal tracking-[-0.5px] text-[#545d82]">
                                    *최대 10개까지 추가 가능합니다.
                                </span>
                            </FieldLegend>
                            <div
                                className="mt-2.5 flex min-h-[50px] items-center"
                                aria-label="구성품"
                            >
                                <IncludedItemsField
                                    items={includedItems}
                                    onChange={onIncludedItemChange}
                                    overflow
                                    ariaLabel="구성품"
                                />
                            </div>
                        </fieldset>
                    </div>
                )}

                {onDefectStatusChange && (
                    <fieldset>
                        <FieldLegend required>하자 여부</FieldLegend>
                        <div
                            className="mt-2.5 grid gap-3 sm:grid-cols-3"
                            role="radiogroup"
                            aria-label="하자 여부"
                        >
                            <ChoiceButton
                                label="하자 없음"
                                selected={defectStatus === "none"}
                                onClick={() => onDefectStatusChange("none")}
                                className="typography-body-bold h-14 rounded-lg px-3 py-3 text-[15px] leading-[22px] font-semibold"
                            />
                            <ChoiceButton
                                label="하자 있음"
                                selected={defectStatus === "has-defect"}
                                onClick={() => onDefectStatusChange("has-defect")}
                                className="typography-body-bold h-14 rounded-lg px-3 py-3 text-[15px] leading-[22px] font-semibold"
                            />
                            <ChoiceButton
                                label="잘 모르겠어요"
                                selected={defectStatus === "unknown"}
                                onClick={() => onDefectStatusChange("unknown")}
                                className="typography-body-bold h-14 rounded-lg px-3 py-3 text-[15px] leading-[22px] font-semibold"
                            />
                        </div>
                    </fieldset>
                )}

                <div className="flex flex-col gap-2.5">
                    <FieldLabel htmlFor="direct-price" required>
                        희망 가격
                    </FieldLabel>
                    <div className="flex flex-col items-start gap-3">
                        <div className="relative w-full">
                            <Input
                                id="direct-price"
                                type="text"
                                inputMode="numeric"
                                value={formatPrice(price)}
                                onChange={(event) =>
                                    onPriceChange(event.target.value.replace(/\D/g, ""))
                                }
                                className={`${fieldClassName} pr-12 text-right`}
                                placeholder="500 ~ 100,000,000"
                                aria-label="희망 가격"
                                aria-invalid={Boolean(errors.price)}
                            />
                            <span className="typography-body-medium pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 text-[#6b7395]">
                                원
                            </span>
                        </div>
                        <label className="typography-body-medium flex cursor-pointer items-center gap-2 text-[#545d82] transition-colors hover:text-[#6653fb]">
                            <Checkbox
                                checked={allowPriceProposal}
                                onCheckedChange={(nextChecked) =>
                                    onAllowPriceProposalChange(nextChecked === true)
                                }
                                aria-label="가격 제안 허용"
                                className="size-[13px] rounded-[2px] border-[#d3d3d3] data-[state=checked]:border-[#5d55fe] data-[state=checked]:bg-[#5d55fe] [&_svg]:size-[11px]"
                            />
                            <span>가격 제안 허용</span>
                        </label>
                    </div>
                    <FieldError message={errors.price} />
                </div>

                <TradeMethodField
                    tradeMethod={tradeMethod}
                    deliveryType={deliveryType}
                    deliveryFee={deliveryFee}
                    tradeLocation={tradeLocation}
                    onTradeMethodChange={onTradeMethodChange}
                    onDeliveryTypeChange={onDeliveryTypeChange}
                    onDeliveryFeeChange={onDeliveryFeeChange}
                    onTradeLocationChange={onTradeLocationChange}
                    errors={errors}
                    idPrefix="direct"
                />
            </section>
        </div>
    );
}
