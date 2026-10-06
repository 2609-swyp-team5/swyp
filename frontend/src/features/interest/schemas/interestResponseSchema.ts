import { z } from "zod";

import { productConditionSchema } from "@/features/sell/schemas/productSchema";
import {
    interestRecommendationSchema,
    interestSourceSchema,
    interestStatusSchema,
} from "./interestSchema";

export const interestListItemSchema = z.object({
    interestId: z.number(),
    source: interestSourceSchema,
    targetId: z.number(),
    title: z.string(),
    price: z.number(),
    status: z.string(),
    condition: productConditionSchema.nullable(),
    categoryName: z.string(),
    thumbnailUrl: z.string().nullable(),
    recommendation: interestRecommendationSchema.nullable(),
    interestStatus: interestStatusSchema,
    marketAveragePrice: z.number().nullable(),
    platformName: z.string().nullable(),
    externalUrl: z.string().nullable(),
    targetPrice: z.number().nullable(),
    createdAt: z.string(),
});

export const interestTargetPriceResponseSchema = z.object({
    interestId: z.number(),
    targetPrice: z.number().nullable(),
});

export const interestListResponseSchema = z.object({
    content: z.array(interestListItemSchema),
    nextCursor: z.string().nullable(),
    hasNext: z.boolean(),
    totalCount: z.number().nullable(),
    statusCounts: z.record(z.number()).nullable(),
});

export const interestCreateResponseSchema = z.object({
    interestId: z.number(),
});
