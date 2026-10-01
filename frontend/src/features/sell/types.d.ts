import type { z } from "zod";

import type {
    aiProductCreateInputSchema,
    defectStatusSchema,
    deliveryTypeSchema,
    directProductCreateRequestSchema,
    operationStatusSchema,
    productConditionSchema,
    productCreateRequestSchema,
    productStatusSchema,
    productUpdateRequestSchema,
    tradeMethodSchema,
} from "./schemas/productSchema";

export type ProductCondition = z.infer<typeof productConditionSchema>;
export type ProductStatus = z.infer<typeof productStatusSchema>;
export type DefectStatus = z.infer<typeof defectStatusSchema>;
export type TradeMethod = z.infer<typeof tradeMethodSchema>;
export type DeliveryType = z.infer<typeof deliveryTypeSchema>;
export type OperationStatus = z.infer<typeof operationStatusSchema>;
export type ProductCreateRequest = z.infer<typeof productCreateRequestSchema>;
export type DirectProductCreateRequest = z.infer<typeof directProductCreateRequestSchema>;
export type ProductUpdateRequest = z.infer<typeof productUpdateRequestSchema>;

export interface DirectProductCreateInput {
    images: File[];
    request: DirectProductCreateRequest;
}

export interface ProductUpdateInput {
    files: File[];
    request: ProductUpdateRequest;
}

export type AiProductCreateInput = z.infer<typeof aiProductCreateInputSchema>;

export type ProductRegisterStep = "IMAGE_UPLOAD" | "IMAGE_ANALYSIS" | "PRODUCT_SAVE";
export type ProductRegisterStepStatus = "START" | "DONE" | "SKIP";
export type ProductRegisterProgressStatus = ProductRegisterStepStatus | "ERROR";

export type ProductPlatformStatus = "POSTING" | "POSTED" | "FAILED" | "REMOVED";

export interface ProductPlatform {
    platform: string;
    platformName: string;
    status: ProductPlatformStatus;
    externalProductId: string | null;
    productUrl: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface ProductRegisterProgress {
    step: ProductRegisterStep;
    status: ProductRegisterProgressStatus;
    index: number;
    total: number;
    message: string;
}

export type ProductRegisterError = Error & {
    code?: string;
};

export interface ProductResponse {
    id: number;
    memberId: number;
    nickname: string;
    category: {
        id: number;
        name: string;
        parentId: number | null;
        leaf: boolean;
    };
    title: string;
    brand: string | null;
    description: string | null;
    price: number;
    status: ProductStatus;
    condition: ProductCondition;
    defectStatus: DefectStatus;
    purchasedAt: string | null;
    purchasedMonths: number | null;
    includedItems: string[];
    allowPriceSuggestion: boolean;
    tradeMethod: TradeMethod;
    deliveryType: DeliveryType | null;
    preferredTradeRegion: string | null;
    imageUrls: string[];
    tags: string[];
    recommendation: string | null;
    suggestedPrice: number | null;
    analysisDescription: string | null;
    platforms?: ProductPlatform[] | null;
    createdAt: string;
    updatedAt: string;
}

export interface ProductSummaryResponse {
    id: number;
    title: string;
    brand: string | null;
    price: number;
    status: ProductStatus;
    condition: ProductCondition;
    defectStatus: DefectStatus;
    purchasedMonths: number | null;
    categoryName: string;
    thumbnailUrl: string | null;
    recommendation: string | null;
    marketAveragePrice: number | null;
    createdAt: string;
}
