import { z } from "zod";

import {
    defectStatusSchema,
    deliveryTypeSchema,
    productConditionSchema,
    productPlatformStatusSchema,
    productStatusSchema,
    tradeMethodSchema,
} from "./productSchema";

export const productRecommendationSchema = z.enum(["SELL", "HOLD", "BUY", "WAIT"]);

export const productPlatformSchema = z
    .object({
        platform: z.string(),
        platformName: z.string(),
        status: productPlatformStatusSchema,
        externalProductId: z.string().nullable(),
        productUrl: z.string().nullable(),
        createdAt: z.string(),
        updatedAt: z.string(),
    })
    .passthrough();

export const productResponseSchema = z.object({
    id: z.number(),
    memberId: z.number(),
    nickname: z.string(),
    category: z.object({
        id: z.number(),
        name: z.string(),
        parentId: z.number().nullable(),
        leaf: z.boolean(),
    }),
    title: z.string(),
    brand: z.string().nullable(),
    description: z.string().nullable(),
    price: z.number(),
    status: productStatusSchema,
    condition: productConditionSchema,
    defectStatus: defectStatusSchema,
    purchasedAt: z.string().nullable(),
    purchasedMonths: z.number().nullable(),
    includedItems: z.array(z.string()),
    allowPriceSuggestion: z.boolean(),
    tradeMethod: tradeMethodSchema,
    deliveryType: deliveryTypeSchema.nullable(),
    preferredTradeRegion: z.string().nullable(),
    imageUrls: z.array(z.string()),
    tags: z.array(z.string()),
    recommendation: productRecommendationSchema.nullable(),
    suggestedPrice: z.number().nullable(),
    analysisDescription: z.string().nullable(),
    platforms: z.array(productPlatformSchema).nullable(),
    createdAt: z.string(),
    updatedAt: z.string(),
});

export const productSummaryResponseSchema = z.object({
    id: z.number(),
    title: z.string(),
    brand: z.string().nullable(),
    price: z.number(),
    status: productStatusSchema,
    condition: productConditionSchema,
    defectStatus: defectStatusSchema,
    purchasedMonths: z.number().nullable(),
    categoryName: z.string(),
    thumbnailUrl: z.string().nullable(),
    recommendation: productRecommendationSchema.nullable(),
    marketAveragePrice: z.number().nullable(),
    createdAt: z.string(),
});

export const productSummaryPageResponseSchema = z.object({
    content: z.array(productSummaryResponseSchema),
    nextCursor: z.string().nullable(),
    hasNext: z.boolean(),
    totalCount: z.number().nullable(),
    statusCounts: z.record(z.number()).nullable(),
});

export type ProductPlatform = z.infer<typeof productPlatformSchema>;
export type ProductResponse = z.infer<typeof productResponseSchema>;
export type ProductSummaryResponse = z.infer<typeof productSummaryResponseSchema>;
