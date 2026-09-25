export type DirectImagePreview = {
    file: File | null;
    url: string;
};

export type DirectRegisterInfoState = {
    images: DirectImagePreview[];
    parentCategoryId: string;
    childCategoryId: string;
    title: string;
    brand: string;
    description: string;
    tags: string[];
};

export type DirectProductCondition = "S" | "A" | "B" | "C" | "D";
export type DirectPurchasePeriod = "0" | "1" | "2" | "3" | "4" | "5" | "6" | "unknown";
export type DirectIncludedItem = string;
export type DirectDefectStatus = "none" | "has-defect" | "unknown";
export type DirectTradeMethod = "direct" | "delivery";
export type DirectDeliveryType = "INCLUDED" | "PREPAID" | null;

export type DirectStatusPriceState = {
    productCondition: DirectProductCondition;
    purchasePeriod: DirectPurchasePeriod;
    includedItems: DirectIncludedItem[];
    defectStatus: DirectDefectStatus;
    price: string;
    allowPriceProposal: boolean;
    tradeMethod: DirectTradeMethod;
    deliveryType: DirectDeliveryType;
    tradeLocation: string;
};

export type DirectStatusPriceErrors = {
    price: string;
    deliveryType: string;
};
