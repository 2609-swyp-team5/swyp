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
    IncludedItemsField,
    type IncludedItemOption,
} from "@/features/sell/components/shared/IncludedItemsField";
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
    onPurchasePeriodChange: (value: DirectPurchasePeriod) => void;
    onIncludedItemChange: (value: DirectIncludedItem, checked: boolean) => void;
    onDefectStatusChange: (value: DirectDefectStatus) => void;
    onPriceChange: (value: string) => void;
    onAllowPriceProposalChange: (checked: boolean) => void;
    onTradeMethodChange: (value: DirectTradeMethod) => void;
    onDeliveryTypeChange: (value: Exclude<DirectDeliveryType, null>) => void;
    onTradeLocationChange: (value: string) => void;
};

const productConditionOptions: {
    value: DirectProductCondition;
    label: string;
    description: string;
}[] = [
    { value: "S", label: "미개봉", description: "포장을 개봉하지 않은 새 상품" },
    { value: "A", label: "거의 새 상품", description: "사용 흔적이 거의 없음" },
    { value: "B", label: "사용감 적음", description: "작은 사용 흔적이 있음" },
    { value: "C", label: "사용감 있음", description: "스크래치나 사용 흔적이 확인됨" },
    { value: "D", label: "수리 필요", description: "일부 기능에 문제가 있음" },
];

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

const includedItemOptions: IncludedItemOption[] = [
    { value: "body", label: "본체" },
    { value: "charging-cable", label: "충전 케이블" },
    { value: "box", label: "박스" },
    { value: "manual", label: "설명서" },
    { value: "accessory", label: "액세서리" },
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
                "border-[1.5px] transition-colors focus-visible:ring-3 focus-visible:ring-[#6653fb]/30 focus-visible:outline-none",
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
    tradeLocation,
    errors,
    onProductConditionChange,
    onPurchasePeriodChange,
    onIncludedItemChange,
    onDefectStatusChange,
    onPriceChange,
    onAllowPriceProposalChange,
    onTradeMethodChange,
    onDeliveryTypeChange,
    onTradeLocationChange,
}: DirectStatusPriceStepProps) {
    const fieldClassName =
        "h-[50px] rounded-[8px] border border-[#d3d3d3] bg-[#fafbff] px-4 py-3 text-[16px] leading-[25px] text-[#6b6c7b] shadow-none placeholder:text-[#d3d3d3] focus-visible:border-[#6653fb] focus-visible:ring-0";

    return (
        <div className="flex w-full max-w-[1144px] flex-col gap-8">
            <section className="flex flex-col gap-7 rounded-xl border border-[#dee5ed] bg-white p-8">
                <fieldset>
                    <FieldLegend required>상품 상태</FieldLegend>
                    <div
                        className="mt-2.5 grid gap-5 sm:grid-cols-2 lg:grid-cols-5"
                        role="radiogroup"
                        aria-label="상품 상태"
                    >
                        {productConditionOptions.map((option) => (
                            <ChoiceButton
                                key={option.value}
                                label={
                                    <span className="flex flex-col items-start gap-1 text-left">
                                        <span className="text-[13px] leading-5 font-semibold">
                                            {option.label}
                                        </span>
                                        <span className="text-[10px] leading-[15px] font-normal">
                                            {option.description}
                                        </span>
                                    </span>
                                }
                                selected={productCondition === option.value}
                                onClick={() => onProductConditionChange(option.value)}
                                className="min-h-[65px] rounded-lg px-3 py-2"
                            />
                        ))}
                    </div>
                </fieldset>

                <div className="grid gap-6 lg:grid-cols-2">
                    <div className="flex flex-col gap-2.5">
                        <FieldLabel htmlFor="direct-purchase-period">구매 시기</FieldLabel>
                        <Select value={purchasePeriod} onValueChange={onPurchasePeriodChange}>
                            <SelectTrigger
                                id="direct-purchase-period"
                                aria-label="구매 시기"
                                className={`${fieldClassName} w-full justify-between`}
                            >
                                <SelectValue />
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
                        <FieldLegend>구성품</FieldLegend>
                        <div className="mt-2.5 flex min-h-[50px] items-center" aria-label="구성품">
                            <IncludedItemsField
                                items={includedItems}
                                options={includedItemOptions}
                                onChange={onIncludedItemChange}
                                overflow
                                ariaLabel="구성품"
                            />
                        </div>
                    </fieldset>
                </div>

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
                            className="h-14 rounded-lg px-3 py-3 text-[15px] leading-[22px] font-semibold"
                        />
                        <ChoiceButton
                            label="하자 있음"
                            selected={defectStatus === "has-defect"}
                            onClick={() => onDefectStatusChange("has-defect")}
                            className="h-14 rounded-lg px-3 py-3 text-[15px] leading-[22px] font-semibold"
                        />
                        <ChoiceButton
                            label="잘 모르겠어요"
                            selected={defectStatus === "unknown"}
                            onClick={() => onDefectStatusChange("unknown")}
                            className="h-14 rounded-lg px-3 py-3 text-[15px] leading-[22px] font-semibold"
                        />
                    </div>
                </fieldset>

                <div className="flex flex-col gap-2.5">
                    <FieldLabel htmlFor="direct-price" required>
                        희망 가격
                    </FieldLabel>
                    <div className="flex items-center gap-3">
                        <div className="relative flex-1">
                            <Input
                                id="direct-price"
                                type="text"
                                inputMode="numeric"
                                value={formatPrice(price)}
                                onChange={(event) =>
                                    onPriceChange(event.target.value.replace(/\D/g, ""))
                                }
                                className={`${fieldClassName} pr-12 text-right`}
                                aria-label="희망 가격"
                                aria-invalid={Boolean(errors.price)}
                            />
                            <span className="pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 text-[16px] leading-[25px] text-[#6b7395]">
                                원
                            </span>
                        </div>
                        <label className="flex shrink-0 cursor-pointer items-center gap-2 text-[16px] leading-[25px] text-[#545d82] transition-colors hover:text-[#6653fb]">
                            <Checkbox
                                checked={allowPriceProposal}
                                onCheckedChange={(nextChecked) =>
                                    onAllowPriceProposalChange(nextChecked === true)
                                }
                                aria-label="가격 제안 허용"
                                className="size-[13px] rounded-[2px] border-[#767676] data-[state=checked]:border-[#5d55fe] data-[state=checked]:bg-[#5d55fe] [&_svg]:size-[11px]"
                            />
                            <span>가격 제안 허용</span>
                        </label>
                    </div>
                    <FieldError message={errors.price} />
                </div>

                <fieldset>
                    <FieldLegend required>거래 방식</FieldLegend>
                    <div
                        className="mt-2.5 flex flex-wrap gap-3"
                        role="radiogroup"
                        aria-label="거래 방식"
                    >
                        <ChoiceButton
                            label="직거래"
                            selected={tradeMethod === "direct"}
                            onClick={() => onTradeMethodChange("direct")}
                            className="rounded-full px-5 py-1 text-[14px] leading-[21px] font-medium"
                        />
                        <ChoiceButton
                            label="택배 거래"
                            selected={tradeMethod === "delivery"}
                            onClick={() => onTradeMethodChange("delivery")}
                            className="rounded-full px-5 py-1 text-[14px] leading-[21px] font-medium"
                        />
                    </div>
                    {tradeMethod === "delivery" ? (
                        <fieldset className="mt-6">
                            <FieldLegend required>배송비 부담 방식</FieldLegend>
                            <div
                                className="mt-2.5 flex flex-wrap gap-3"
                                role="radiogroup"
                                aria-label="배송비 부담 방식"
                            >
                                <ChoiceButton
                                    label="배송비 포함"
                                    selected={deliveryType === "INCLUDED"}
                                    onClick={() => onDeliveryTypeChange("INCLUDED")}
                                    className="rounded-full px-5 py-1 text-[14px] leading-[21px] font-medium"
                                />
                                <ChoiceButton
                                    label="배송비 별도"
                                    selected={deliveryType === "PREPAID"}
                                    onClick={() => onDeliveryTypeChange("PREPAID")}
                                    className="rounded-full px-5 py-1 text-[14px] leading-[21px] font-medium"
                                />
                            </div>
                            {errors.deliveryType && (
                                <div className="mt-2.5">
                                    <FieldError message={errors.deliveryType} />
                                </div>
                            )}
                        </fieldset>
                    ) : (
                        <Input
                            id="direct-trade-location"
                            value={tradeLocation}
                            onChange={(event) => onTradeLocationChange(event.target.value)}
                            placeholder="거래 희망 지역 (예: 서울 강남구)"
                            className={`${fieldClassName} mt-3`}
                            aria-label="거래 희망 지역"
                        />
                    )}
                </fieldset>
            </section>
        </div>
    );
}
