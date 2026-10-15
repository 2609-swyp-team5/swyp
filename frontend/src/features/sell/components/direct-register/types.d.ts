import type { CategoryOptionSelection } from "@/features/sell/types";
import type { IncludedStatus } from "@/features/sell/components/shared/IncludedStatusField";

export type DirectImagePreview = {
    file: File | null;
    url: string;
};

export type DirectRegisterInfoState = {
    images: DirectImagePreview[];
    parentCategoryId: string;
    childCategoryId: string;
    subCategoryId: string;
    title: string;
    brand: string;
    description: string;
    tags: string[];
};

export type ProductEditInfoState = DirectRegisterInfoState & {
    categoryOptions: CategoryOptionSelection[];
};

export type DirectProductCondition = "S" | "A" | "B" | "C" | "D";
export type DirectTradeMethod = "direct" | "delivery";
export type DirectDeliveryType = "INCLUDED" | "PREPAID" | null;

export type DirectStatusPriceState = {
    productCondition: DirectProductCondition;
    includedStatus: IncludedStatus;
    price: string;
    allowPriceProposal: boolean;
    tradeMethod: DirectTradeMethod;
    deliveryType: DirectDeliveryType;
    deliveryFee?: string;
    tradeLocation: string;
};

export type DirectStatusPriceErrors = {
    price: string;
    deliveryType: string;
    deliveryFee: string;
    tradeLocation: string;
};
