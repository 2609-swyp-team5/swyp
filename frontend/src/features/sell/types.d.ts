import type { z } from "zod";

import type {
    aiProductCreateInputSchema,
    defectStatusSchema,
    deliveryTypeSchema,
    directProductCreateRequestSchema,
    operationStatusSchema,
    productConditionSchema,
    productPlatformStatusSchema,
    productCreateRequestSchema,
    productStatusSchema,
    productUpdateRequestSchema,
    tradeMethodSchema,
} from "./schemas/productSchema";
import type {
    ProductRegisterStep,
    ProductRegisterStepStatus,
} from "./schemas/productRegisterStreamSchema";

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

export type ProductRegisterProgressStatus = ProductRegisterStepStatus | "ERROR";
export type ProductPlatformStatus = z.infer<typeof productPlatformStatusSchema>;

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

export type {
    ProductPlatform,
    ProductResponse,
    ProductSummaryResponse,
} from "./schemas/productResponseSchema";
export type {
    ProductRegisterStep,
    ProductRegisterStepStatus,
} from "./schemas/productRegisterStreamSchema";
