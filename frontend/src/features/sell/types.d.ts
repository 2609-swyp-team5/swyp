import type { z } from "zod";

import type {
    aiProductCreateInputSchema,
    categoryOptionSelectionSchema,
    defectStatusSchema,
    deliveryTypeSchema,
    directProductCreateRequestSchema,
    includedItemStatusSchema,
    productConditionSchema,
    productPlatformStatusSchema,
    productCreateRequestSchema,
    productStatusSchema,
    productUpdateRequestSchema,
    tradeMethodSchema,
} from "./schemas/productSchema";
import type {
    MarketAnalysisProgress,
    ProductRegisterStep,
    ProductRegisterStepStatus,
} from "./schemas/productRegisterStreamSchema";

export type ProductCondition = z.infer<typeof productConditionSchema>;
export type ProductStatus = z.infer<typeof productStatusSchema>;
export type DefectStatus = z.infer<typeof defectStatusSchema>;
export type TradeMethod = z.infer<typeof tradeMethodSchema>;
export type DeliveryType = z.infer<typeof deliveryTypeSchema>;
export type IncludedItemStatus = z.infer<typeof includedItemStatusSchema>;
export type ProductCreateRequest = z.infer<typeof productCreateRequestSchema>;
export type CategoryOptionSelection = z.infer<typeof categoryOptionSelectionSchema>;
export type DirectProductCreateRequest = z.infer<typeof directProductCreateRequestSchema>;
export type ProductUpdateRequest = z.infer<typeof productUpdateRequestSchema>;

export interface ProductStatusUpdateRequest {
    status: ProductStatus;
    soldPrice?: number;
    soldPlatform?: string;
}

export interface DirectProductCreateInput {
    images: File[];
    request: DirectProductCreateRequest;
}

export interface ProductUpdateInput {
    files: File[];
    request: ProductUpdateRequest;
}

export type AiProductCreateInput = z.infer<typeof aiProductCreateInputSchema>;

export type ProductRegisterProgressStatus = ProductRegisterStepStatus | "ERROR";
export type ProductPlatformStatus = z.infer<typeof productPlatformStatusSchema>;

export interface ProductRegisterProgress {
    step: ProductRegisterStep;
    status: ProductRegisterProgressStatus;
    index: number;
    total: number;
    message: string;
    // 시세 분석 단계(MARKET_ANALYSIS)만 — 마지막으로 받은 세부 단계(아직 없으면 null)
    marketAnalysis?: MarketAnalysisProgress | null;
}

export type ProductRegisterError = Error & {
    code?: string;
};

export type {
    ProductPlatformPublishResponse,
    ProductPlatform,
    ProductResponse,
    ProductSummaryResponse,
} from "./schemas/productResponseSchema";
export type {
    ProductRegisterStep,
    ProductRegisterStepStatus,
} from "./schemas/productRegisterStreamSchema";
