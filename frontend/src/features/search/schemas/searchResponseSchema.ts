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
    // 로그인 사용자의 검색 결과별 관심 상태
    favorite: z.boolean(),
    interestId: z.number().nullable(),
});

export const searchResponseSchema = z.object({
    content: z.array(searchResultItemSchema),
    nextCursor: z.string().nullable(),
    hasNext: z.boolean(),
    totalCount: z.number().nullable(),
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
    condition: productConditionSchema.nullable(),
    defectStatus: defectStatusSchema.nullable(),
    tradeMethod: productResponseSchema.shape.tradeMethod.nullable(),
    includedItems: z.array(z.string()),
    preferredTradeRegion: z.string().nullable(),
    createdAt: z.string(),
    updatedAt: z.string(),
    // 로그인 사용자의 상세 상품 관심 상태
    favorite: z.boolean(),
    interestId: z.number().nullable(),
});
