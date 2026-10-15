"use client";

import { Checkbox } from "@/common/components/ui/Checkbox";
import { Input } from "@/common/components/ui/Input";
import {
    IncludedStatusField,
    type IncludedStatus,
} from "@/features/sell/components/shared/IncludedStatusField";
import { ProductConditionField } from "@/features/sell/components/shared/ProductConditionField";
import { TradeMethodField } from "@/features/sell/components/shared/TradeMethodField";
import {
    FieldError,
    FieldLabel,
    FieldLegend,
} from "@/features/sell/components/direct-register/DirectRegisterFields";
import type {
    DirectDeliveryType,
    DirectProductCondition,
    DirectStatusPriceErrors,
    DirectStatusPriceState,
    DirectTradeMethod,
} from "./types";

type DirectStatusPriceStepProps = DirectStatusPriceState & {
    errors: DirectStatusPriceErrors;
    onProductConditionChange: (value: DirectProductCondition) => void;
    onIncludedStatusChange: (value: IncludedStatus) => void;
    onPriceChange: (value: string) => void;
    onAllowPriceProposalChange: (checked: boolean) => void;
    onTradeMethodChange: (value: DirectTradeMethod) => void;
    onDeliveryTypeChange: (value: Exclude<DirectDeliveryType, null>) => void;
    onDeliveryFeeChange: (value: string) => void;
    onTradeLocationChange: (value: string) => void;
};

function formatPrice(value: string) {
    const digits = value.replace(/\D/g, "");

    return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

export function DirectStatusPriceStep({
    productCondition,
    includedStatus,
    price,
    allowPriceProposal,
    tradeMethod,
    deliveryType,
    deliveryFee = "",
    tradeLocation,
    errors,
    onProductConditionChange,
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

                <fieldset>
                    <FieldLegend required>구성품</FieldLegend>
                    <div className="mt-2.5">
                        <IncludedStatusField
                            value={includedStatus}
                            onChange={onIncludedStatusChange}
                        />
                    </div>
                </fieldset>

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
