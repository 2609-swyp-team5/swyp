import { z } from "zod";

import { productConditionSchema } from "@/features/sell/schemas/productSchema";
import { productRecommendationSchema } from "@/features/sell/schemas/productResponseSchema";

export const interestSourceSchema = z.enum(["OUR", "EXTERNAL"]);

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
    recommendation: productRecommendationSchema.nullable(),
    marketAveragePrice: z.number().nullable(),
    platformName: z.string().nullable(),
    externalUrl: z.string().nullable(),
    targetPrice: z.number().nullable(),
    createdAt: z.string(),
});

export const interestListResponseSchema = z.object({
    content: z.array(interestListItemSchema),
    nextCursor: z.string().nullable(),
    hasNext: z.boolean(),
});

export const interestCreateResponseSchema = z.object({
    interestId: z.number(),
});
