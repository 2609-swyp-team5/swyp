"use client";

import { useProductAnalysisQuery } from "./useProductAnalysisQuery";
import { useProductCompetitionQuery } from "./useProductCompetitionQuery";
import { useProductPriceTrendQuery } from "./useProductPriceTrendQuery";
import { useProductSummaryQuery } from "./useProductSummaryQuery";
import { useProductValuationForecastQuery } from "./useProductValuationForecastQuery";
import type { ProductManagementPerspective } from "../types";

export function useProductManagementSectionsQuery(
    productId: number,
    options?: {
        enabled?: boolean;
        perspective?: ProductManagementPerspective;
        summaryEnabled?: boolean;
        analysisEnabled?: boolean;
        competitionEnabled?: boolean;
    },
) {
    const enabled = options?.enabled ?? true;
    const summaryEnabled = enabled && (options?.summaryEnabled ?? true);
    const analysisEnabled = enabled && (options?.analysisEnabled ?? true);
    const competitionEnabled = enabled && (options?.competitionEnabled ?? true);
    const perspective = options?.perspective ?? "SELL";

    const productSummary = useProductSummaryQuery(productId, { enabled: summaryEnabled });
    const productAnalysis = useProductAnalysisQuery(productId, {
        enabled: analysisEnabled,
        perspective,
    });
    const productPriceTrend = useProductPriceTrendQuery(productId, { enabled: analysisEnabled });
    const productValuationForecast = useProductValuationForecastQuery(productId, {
        enabled: analysisEnabled,
    });
    const productCompetition = useProductCompetitionQuery(productId, {
        enabled: competitionEnabled,
        perspective,
    });

    return {
        productSummary,
        productAnalysis,
        productPriceTrend,
        productValuationForecast,
        productCompetition,
    };
}
