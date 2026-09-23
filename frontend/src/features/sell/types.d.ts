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

export interface DirectProductCreateInput {
    images: File[];
    request: DirectProductCreateRequest;
}

export type AiProductCreateInput = z.infer<typeof aiProductCreateInputSchema>;

export interface ProductResponse {
    id: number;
    memberId: number;
    nickname: string;
    category: {
        id: number;
        name: string;
        parentId: number | null;
    };
    title: string;
    brand?: string | null;
    description: string | null;
    price: number;
    status: ProductStatus;
    condition: ProductCondition;
    defectStatus: DefectStatus;
    purchasedAt: string | null;
    purchasedMonths: number | null;
    includedItems?: string[];
    allowPriceSuggestion: boolean;
    tradeMethod: TradeMethod;
    deliveryType: DeliveryType | null;
    preferredTradeRegion: string | null;
    imageUrls: string[];
    tags: string[];
    recommendation: string | null;
    suggestedPrice: number | null;
    analysisDescription: string | null;
    createdAt: string;
    updatedAt: string;
}
