"use client";

import { useProductAnalysisQuery } from "./useProductAnalysisQuery";
import { useProductCompetitionQuery } from "./useProductCompetitionQuery";
import { useProductPriceTrendQuery } from "./useProductPriceTrendQuery";
import { useProductSummaryQuery } from "./useProductSummaryQuery";
import { useProductValuationForecastQuery } from "./useProductValuationForecastQuery";
import type { AnalysisRecommendation, ProductManagementPerspective } from "../types";

export function useProductManagementSectionsQuery(
    productId: number,
    options?: {
        perspective?: ProductManagementPerspective;
        summaryEnabled?: boolean;
        buyerRecommendation?: Extract<AnalysisRecommendation, "BUY" | "WAIT">;
        mockRecommendation?: AnalysisRecommendation;
    },
) {
    const summaryEnabled = options?.summaryEnabled ?? true;
    const perspective = options?.perspective ?? "SELL";
    const buyerRecommendation = options?.buyerRecommendation;
    const mockRecommendation = options?.mockRecommendation ?? buyerRecommendation;

    const productSummary = useProductSummaryQuery(productId, { enabled: summaryEnabled });
    const productAnalysis = useProductAnalysisQuery(productId, {
        perspective,
        mockRecommendation,
    });
    const productPriceTrend = useProductPriceTrendQuery(productId);
    const productValuationForecast = useProductValuationForecastQuery(productId);
    const productCompetition = useProductCompetitionQuery(productId, { perspective });

    return {
        productSummary,
        productAnalysis,
        productPriceTrend,
        productValuationForecast,
        productCompetition,
    };
}
