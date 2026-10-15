"use client";

import type { ReactNode } from "react";

import { FieldLabel } from "@/features/sell/components/direct-register/DirectRegisterFields";
import type { DirectDeliveryType } from "@/features/sell/components/direct-register/types";
import {
    IncludedStatusField,
    type IncludedStatus,
} from "@/features/sell/components/shared/IncludedStatusField";
import { ProductConditionField } from "@/features/sell/components/shared/ProductConditionField";
import { TradeMethodField } from "@/features/sell/components/shared/TradeMethodField";
import type { ProductCondition } from "@/features/sell/types";

export type AiTradeMethod = "direct" | "delivery";

type AiRegisterAdditionalInfoStepProps = {
    productCondition: ProductCondition | null;
    includedStatus: IncludedStatus | null;
    tradeMethod: AiTradeMethod | null;
    deliveryType: DirectDeliveryType;
    deliveryFee: string;
    tradeLocation: string;
    onProductConditionChange: (value: ProductCondition) => void;
    onIncludedStatusChange: (value: IncludedStatus) => void;
    onTradeMethodChange: (value: AiTradeMethod) => void;
    onDeliveryTypeChange: (value: Exclude<DirectDeliveryType, null>) => void;
    onDeliveryFeeChange: (value: string) => void;
    onTradeLocationChange: (value: string) => void;
    errors: {
        productCondition: string;
        includedStatus: string;
        tradeMethod: string;
        deliveryType: string;
        deliveryFee: string;
        tradeLocation: string;
    };
    children: ReactNode;
};

export function AiRegisterAdditionalInfoStep({
    productCondition,
    includedStatus,
    tradeMethod,
    deliveryType,
    deliveryFee,
    tradeLocation,
    onProductConditionChange,
    onIncludedStatusChange,
    onTradeMethodChange,
    onDeliveryTypeChange,
    onDeliveryFeeChange,
    onTradeLocationChange,
    errors,
    children,
}: AiRegisterAdditionalInfoStepProps) {
    return (
        <div className="flex w-full flex-col">
            <section className="flex w-full flex-col gap-10 rounded-[20px] border border-[#d3d3d3] bg-white px-6 pt-[50px] pb-[60px] lg:px-[60px]">
                <div className="flex flex-col gap-3">
                    <FieldLabel required>상품 상태</FieldLabel>

                    <ProductConditionField
                        value={productCondition}
                        onChange={onProductConditionChange}
                    />
                    {errors.productCondition && (
                        <p className="text-destructive text-[12px] leading-[18px]">
                            {errors.productCondition}
                        </p>
                    )}
                </div>

                <div className="flex flex-col gap-3">
                    <FieldLabel required>구성품</FieldLabel>
                    <IncludedStatusField value={includedStatus} onChange={onIncludedStatusChange} />
                    {errors.includedStatus && (
                        <p className="text-destructive text-[12px] leading-[18px]">
                            {errors.includedStatus}
                        </p>
                    )}
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
                    errors={{
                        tradeMethod: errors.tradeMethod,
                        deliveryType: errors.deliveryType,
                        deliveryFee: errors.deliveryFee,
                        tradeLocation: errors.tradeLocation,
                    }}
                    idPrefix="ai"
                />
            </section>

            {children}
        </div>
    );
}
