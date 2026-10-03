import { z } from "zod";

import {
    productConditionSchema,
    productPlatformStatusSchema,
    productStatusSchema,
} from "@/features/sell/schemas/productSchema";
import { productRecommendationSchema } from "@/features/sell/schemas/productResponseSchema";

export const analysisRecommendationSchema = productRecommendationSchema;
export const priceForecastPeriodSchema = z.enum(["1M", "3M", "6M"]);

const productAnalysisPriceDistributionBucketSchema = z.object({
    from: z.number(),
    to: z.number(),
    count: z.number(),
});

const productAnalysisSummarySchema = z.discriminatedUnion("type", [
    z.object({
        type: z.literal("SALE_STATS"),
        salesDurationDays: z.number(),
        viewCount: z.number(),
        interestCount: z.number(),
        calculatedAt: z.string().optional(),
    }),
    z.object({
        type: z.literal("WAIT_RECOMMENDATION"),
        waitPeriodDays: z.number(),
        expectedPriceChangeRate: z.number(),
        confidenceScore: z.number(),
    }),
]);

export const productAnalysisResponseSchema = z.object({
    productId: z.number(),
    analysisId: z.number(),
    currentPrice: z.number(),
    suggestedPrice: z.number(),
    recommendation: analysisRecommendationSchema,
    description: z.string(),
    minPrice: z.number(),
    averagePrice: z.number(),
    maxPrice: z.number(),
    marketPriceDiffRate: z.number(),
    marketExpectedPrice: z.number(),
    priceDistribution: z.array(productAnalysisPriceDistributionBucketSchema),
    summary: productAnalysisSummarySchema,
    analyzedAt: z.string(),
});

export const productPriceTrendResponseSchema = z.object({
    productId: z.number(),
    priceTrend: z.object({
        period: z.literal("1M"),
        comparisonBasis: z.literal("PREVIOUS_TRADING_DAY"),
        totalTransactionCount: z.number(),
        points: z.array(
            z.object({
                date: z.string(),
                averagePrice: z.number(),
                transactionCount: z.number(),
                change: z
                    .object({
                        comparedDate: z.string(),
                        amount: z.number(),
                        rate: z.number(),
                    })
                    .nullable(),
            }),
        ),
    }),
});

export const productValuationForecastResponseSchema = z.object({
    productId: z.number(),
    valuationForecast: z.object({
        baseDate: z.string(),
        baseValue: z.number(),
        baseValueRate: z.number(),
        forecasts: z.array(
            z.object({
                period: priceForecastPeriodSchema,
                expectedValue: z.number(),
                expectedValueRate: z.number(),
                expectedChangeRate: z.number(),
            }),
        ),
    }),
});

export const productCompetitionResponseSchema = z.object({
    productId: z.number(),
    competition: z.object({
        count: z.number(),
        level: z.enum(["NONE", "LOW", "MEDIUM", "HIGH"]),
        levelLabel: z.string(),
        items: z.array(
            z.object({
                productId: z.string(),
                platform: z.string(),
                platformName: z.string(),
                imageUrl: z.string(),
                title: z.string(),
                listingPrice: z.number(),
                marketAveragePrice: z.number(),
                priceDiffRate: z.number(),
                productUrl: z.string(),
            }),
        ),
    }),
});

export const productDetailSummaryResponseSchema = z.object({
    id: z.number(),
    status: productStatusSchema,
    createdAt: z.string(),
    title: z.string(),
    price: z.number(),
    category: z.object({
        id: z.number(),
        name: z.string(),
        parentId: z.number().nullable(),
    }),
    condition: productConditionSchema,
    imageUrls: z.array(z.string()),
    platforms: z.array(
        z.object({
            platform: z.string(),
            platformName: z.string(),
            status: productPlatformStatusSchema,
            productUrl: z.string().nullable(),
        }),
    ),
});

export type AnalysisRecommendation = z.infer<typeof analysisRecommendationSchema>;
export type PriceForecastPeriod = z.infer<typeof priceForecastPeriodSchema>;
export type ProductAnalysisResponse = z.infer<typeof productAnalysisResponseSchema>;
export type ProductPriceTrendResponse = z.infer<typeof productPriceTrendResponseSchema>;
export type ProductValuationForecastResponse = z.infer<
    typeof productValuationForecastResponseSchema
>;
export type ProductCompetitionResponse = z.infer<typeof productCompetitionResponseSchema>;
export type ProductDetailSummaryResponse = z.infer<typeof productDetailSummaryResponseSchema>;
