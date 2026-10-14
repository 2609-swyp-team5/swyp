import { z } from "zod";

import {
    deliveryTypeSchema,
    productConditionSchema,
    productPlatformStatusSchema,
    productStatusSchema,
    tradeMethodSchema,
} from "@/features/sell/schemas/productSchema";
import { productRecommendationSchema } from "@/features/sell/schemas/productResponseSchema";

export const analysisRecommendationSchema = productRecommendationSchema;
export const priceForecastPeriodSchema = z.enum(["1M", "3M", "6M"]);
export const analysisStatusSchema = z.enum([
    "ANALYZED",
    "ANALYZING",
    "SKIPPED",
    "NOT_ANALYZED",
    "UNAVAILABLE",
]);

export const productAnalysisRequestResponseSchema = z.object({
    productId: z.number(),
    analysisStatus: analysisStatusSchema,
    analysisSkipReason: z.string().nullable(),
    analysisSkipMessage: z.string().nullable(),
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

export const productPriceDistributionResponseSchema = z.object({
    productId: z.number(),
    onSale: z.object({
        count: z.number(),
        minPrice: z.number().nullable().optional(),
        averagePrice: z.number().nullable().optional(),
        suggestedPrice: z.number().nullable().optional(),
        maxPrice: z.number().nullable().optional(),
        comparisonBasis: z.enum(["SAME", "RELATED"]).nullable().optional(),
        analyzedAt: z.string().nullable().optional(),
        buckets: z.array(
            z.object({
                from: z.number(),
                to: z.number(),
                count: z.number(),
            }),
        ),
    }),
    soldOut: z.object({
        days: z.number(),
        from: z.string(),
        to: z.string(),
        count: z.number(),
        minPrice: z.number().nullable().optional(),
        averagePrice: z.number().nullable().optional(),
        suggestedPrice: z.number().nullable().optional(),
        maxPrice: z.number().nullable().optional(),
        buckets: z.array(
            z.object({
                from: z.number(),
                to: z.number(),
                count: z.number(),
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
                marketAveragePrice: z.number().nullable(),
                priceDiffRate: z.number().nullable(),
                productUrl: z.string(),
            }),
        ),
    }),
});

export type ProductAnalysisRequestResponse = z.infer<typeof productAnalysisRequestResponseSchema>;

export const productDetailSummaryResponseSchema = z
    .object({
        source: z.enum(["OUR", "EXTERNAL"]),
        id: z.number(),
        title: z.string(),
        brand: z.string().nullable(),
        description: z.string().nullable(),
        category: z.object({
            id: z.number(),
            name: z.string(),
            parentId: z.number().nullable(),
            leaf: z.boolean(),
        }),
        price: z.number(),
        soldPrice: z.number().nullable().optional(),
        soldPlatform: z.string().nullable().optional(),
        imageUrls: z.array(z.string()),
        tags: z.array(z.string()),
        includedItems: z.array(z.string()),
        condition: productConditionSchema.nullable(),
        tradeMethod: tradeMethodSchema.nullable().optional(),
        deliveryType: deliveryTypeSchema.nullable().optional(),
        status: productStatusSchema.or(z.literal("RESERVED")),
        createdAt: z.string(),
        updatedAt: z.string(),
        viewCount: z.number().nullable(),
        interestCount: z.number(),
        daysOnSale: z.number().nullable(),
        platforms: z.array(
            z.object({
                platform: z.string().optional(),
                platformName: z.string(),
                status: productPlatformStatusSchema.optional(),
                productUrl: z.string().nullable(),
            }),
        ),
    })
    .transform(
        ({
            source,
            id,
            title,
            brand,
            description,
            category,
            price,
            soldPrice,
            soldPlatform,
            imageUrls,
            tags,
            includedItems,
            condition,
            tradeMethod,
            deliveryType,
            status,
            createdAt,
            updatedAt,
            viewCount,
            interestCount,
            daysOnSale,
            platforms,
        }) => ({
            source,
            id,
            title,
            brand,
            description,
            price,
            ...(soldPrice !== undefined ? { soldPrice } : {}),
            ...(soldPlatform !== undefined ? { soldPlatform } : {}),
            status,
            createdAt,
            updatedAt,
            category: {
                id: category.id,
                name: category.name,
                parentId: category.parentId,
                leaf: category.leaf,
            },
            tags,
            includedItems,
            condition,
            tradeMethod: tradeMethod ?? null,
            deliveryType: deliveryType ?? null,
            imageUrls,
            viewCount,
            interestCount,
            daysOnSale,
            platforms: platforms.map(({ platform, platformName, status, productUrl }) => ({
                platform: platform ?? platformName,
                platformName,
                status: status ?? ("POSTED" as const),
                productUrl,
            })),
        }),
    );

export type AnalysisRecommendation = z.infer<typeof analysisRecommendationSchema>;
export type PriceForecastPeriod = z.infer<typeof priceForecastPeriodSchema>;
export type ProductAnalysisResponse = z.infer<typeof productAnalysisResponseSchema>;
export type ProductPriceDistributionResponse = z.infer<
    typeof productPriceDistributionResponseSchema
>;
export type ProductPriceTrendResponse = z.infer<typeof productPriceTrendResponseSchema>;
export type ProductValuationForecastResponse = z.infer<
    typeof productValuationForecastResponseSchema
>;
export type ProductCompetitionResponse = z.infer<typeof productCompetitionResponseSchema>;
export type ProductDetailSummaryResponse = z.infer<typeof productDetailSummaryResponseSchema>;

/** 판매자 목표 판매가 — 비교 기준은 최근 시세 분석 평균가(분석 없으면 null). */
export const productTargetPriceResponseSchema = z.object({
    productId: z.number(),
    targetPrice: z.number().nullable(),
    averagePrice: z.number().nullable(),
    reached: z.boolean(),
});

export type ProductTargetPriceResponse = z.infer<typeof productTargetPriceResponseSchema>;
