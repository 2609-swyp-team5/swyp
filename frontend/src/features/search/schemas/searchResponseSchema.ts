import { z } from "zod";

import { defectStatusSchema, productConditionSchema } from "@/features/sell/schemas/productSchema";
import {
    productRecommendationSchema,
    productResponseSchema,
} from "@/features/sell/schemas/productResponseSchema";

export const searchStatusSchema = z.enum(["DRAFT", "ON_SALE", "RESERVED", "SOLD_OUT"]);

export const searchResultItemSchema = z.object({
    source: z.enum(["OUR", "EXTERNAL"]),
    id: z.number(),
    title: z.string(),
    brand: z.string().nullable(),
    price: z.number(),
    status: z.string(),
    condition: productConditionSchema.nullable(),
    defectStatus: defectStatusSchema.nullable(),
    purchasedMonths: z.number().nullable(),
    categoryName: z.string(),
    tradeRegion: z.string().nullable(),
    deliveryAvailable: z.boolean(),
    thumbnailUrl: z.string().nullable(),
    recommendation: productRecommendationSchema.nullable(),
    marketAveragePrice: z.number().nullable(),
    platformName: z.string().nullable(),
    externalUrl: z.string().nullable(),
    createdAt: z.string(),
});

export const searchResponseSchema = z.object({
    content: z.array(searchResultItemSchema),
    nextCursor: z.string().nullable(),
    hasNext: z.boolean(),
    totalCount: z.number().nullable(),
});

export const aiSearchResponseSchema = z.object({
    aiApplied: z.boolean(),
    condition: z.object({
        keyword: z.string().nullable(),
        excludeKeyword: z.string().nullable(),
        status: z.array(searchStatusSchema),
        platform: z.array(z.enum(["BUNJANG", "OUR"])),
        minPrice: z.number().nullable(),
        maxPrice: z.number().nullable(),
        condition: z.array(productConditionSchema),
        defectStatus: z.array(defectStatusSchema),
        sort: z.enum(["RECOMMENDED", "LATEST", "INTEREST", "PRICE_HIGH", "PRICE_LOW"]),
    }),
    result: searchResponseSchema,
});

export const searchProductDetailSchema = z.object({
    source: z.enum(["OUR", "EXTERNAL"]),
    id: z.number(),
    title: z.string(),
    description: z.string().nullable(),
    price: z.number(),
    status: searchStatusSchema,
    category: productResponseSchema.shape.category,
    imageUrls: z.array(z.string()),
    platformName: z.string().nullable(),
    externalUrl: z.string().nullable(),
    marketAveragePrice: z.number().nullable(),
    updatedAt: z.string(),
});
