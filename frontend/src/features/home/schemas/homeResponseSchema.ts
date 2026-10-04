import { z } from "zod";

import { productSummaryResponseSchema } from "@/features/sell/schemas/productResponseSchema";

export const popularProductsResponseSchema = z.array(productSummaryResponseSchema);

export const homeSummaryResponseSchema = z.object({
    productCount: z.number(),
    productStatusCounts: z.object({
        DRAFT: z.number(),
        ON_SALE: z.number(),
        RESERVED: z.number(),
        SOLD_OUT: z.number(),
    }),
    interestCount: z.number(),
    todayRecommendationCount: z.number(),
    marketPriceDiffRate: z.number().nullable(),
    analyzedProductCount: z.number(),
    lastAnalyzedAt: z.string().nullable(),
});
