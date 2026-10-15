"use client";

import { Input } from "@/common/components/ui/Input";
import {
    FieldError,
    FieldLabel,
    FieldLegend,
} from "@/features/sell/components/direct-register/DirectRegisterFields";
import { TradeLocationField } from "@/features/sell/components/shared/TradeLocationField";

export type TradeMethodValue = "direct" | "delivery";
export type DeliveryTypeValue = "INCLUDED" | "PREPAID" | null;

type TradeMethodFieldProps = {
    tradeMethod: TradeMethodValue | null;
    deliveryType: DeliveryTypeValue;
    deliveryFee: string;
    tradeLocation: string;
    onTradeMethodChange: (value: TradeMethodValue) => void;
    onDeliveryTypeChange: (value: Exclude<DeliveryTypeValue, null>) => void;
    onDeliveryFeeChange: (value: string) => void;
    onTradeLocationChange: (value: string) => void;
    errors: {
        tradeMethod?: string;
        deliveryType?: string;
        deliveryFee?: string;
        tradeLocation?: string;
    };
    idPrefix: string;
};

function formatPrice(value: string) {
    const digits = value.replace(/\D/g, "");

    return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function TradeMethodButton({
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
            className={`h-10 rounded-full border-[1.5px] px-5 py-1 text-[14px] leading-[21px] font-medium transition-colors focus-visible:ring-3 focus-visible:ring-[#6653fb]/30 focus-visible:outline-none ${
                selected
                    ? "border-[#6653fb] bg-[#fafbff] text-[#6653fb]"
                    : "border-[#d3d3d3] bg-white text-[#6b6c7b] hover:border-[#6653fb]"
            }`}
            onClick={onClick}
        >
            {label}
        </button>
    );
}

export function TradeMethodField({
    tradeMethod,
    deliveryType,
    deliveryFee,
    tradeLocation,
    onTradeMethodChange,
    onDeliveryTypeChange,
    onDeliveryFeeChange,
    onTradeLocationChange,
    errors,
    idPrefix,
}: TradeMethodFieldProps) {
    return (
        <fieldset>
            <div className="mt-3 flex flex-col gap-2.5">
                <FieldLegend required>거래 방식</FieldLegend>
                <div
                    className="flex flex-wrap gap-3"
                    role="radiogroup"
                    aria-label="거래 방식"
                    aria-required="true"
                >
                    <TradeMethodButton
                        label="직거래"
                        selected={tradeMethod === "direct"}
                        onClick={() => onTradeMethodChange("direct")}
                    />
                    <TradeMethodButton
                        label="택배 거래"
                        selected={tradeMethod === "delivery"}
                        onClick={() => onTradeMethodChange("delivery")}
                    />
                </div>
                <FieldError message={errors.tradeMethod} />
            </div>

            {tradeMethod === "delivery" ? (
                <fieldset className="mt-3">
                    <div className="mt-3 flex flex-col gap-2.5">
                        <FieldLegend required>배송비 부담 방식</FieldLegend>
                        <div
                            className="flex flex-wrap gap-3"
                            role="radiogroup"
                            aria-label="배송비 부담 방식"
                            aria-required="true"
                        >
                            <TradeMethodButton
                                label="배송비 포함"
                                selected={deliveryType === "INCLUDED"}
                                onClick={() => onDeliveryTypeChange("INCLUDED")}
                            />
                            <TradeMethodButton
                                label="배송비 별도"
                                selected={deliveryType === "PREPAID"}
                                onClick={() => onDeliveryTypeChange("PREPAID")}
                            />
                        </div>
                        <FieldError message={errors.deliveryType} />
                    </div>
                    {deliveryType === "PREPAID" && (
                        <div className="mt-3 flex flex-col gap-2.5">
                            <FieldLabel htmlFor={`${idPrefix}-delivery-fee`} required>
                                배송비
                            </FieldLabel>
                            <div className="relative w-full">
                                <Input
                                    id={`${idPrefix}-delivery-fee`}
                                    type="text"
                                    inputMode="numeric"
                                    value={formatPrice(deliveryFee)}
                                    onChange={(event) =>
                                        onDeliveryFeeChange(event.target.value.replace(/\D/g, ""))
                                    }
                                    className="h-[50px] rounded-[8px] border border-[#d3d3d3] bg-[#fafbff] px-4 py-3 pr-12 text-right text-[16px] leading-[25px] text-[#6b6c7b] shadow-none placeholder:text-[#d3d3d3] focus-visible:border-[#6653fb] focus-visible:ring-0"
                                    placeholder="2,700 ~ 17,000"
                                    aria-label="배송비"
                                    aria-invalid={Boolean(errors.deliveryFee)}
                                />
                                <span className="pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 text-[16px] leading-[25px] text-[#6b7395]">
                                    원
                                </span>
                            </div>
                            <FieldError message={errors.deliveryFee} />
                        </div>
                    )}
                </fieldset>
            ) : tradeMethod === "direct" ? (
                <div className="mt-3 flex flex-col gap-2.5">
                    <FieldLabel htmlFor={`${idPrefix}-trade-location`} required>
                        거래 희망 지역
                    </FieldLabel>
                    <TradeLocationField
                        id={`${idPrefix}-trade-location`}
                        value={tradeLocation}
                        onChange={onTradeLocationChange}
                    />
                    <FieldError message={errors.tradeLocation} />
                </div>
            ) : null}
        </fieldset>
    );
}
