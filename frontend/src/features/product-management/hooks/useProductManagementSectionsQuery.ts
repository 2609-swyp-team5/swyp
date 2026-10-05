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
        enabled?: boolean;
        perspective?: ProductManagementPerspective;
        summaryEnabled?: boolean;
        buyerRecommendation?: Extract<AnalysisRecommendation, "BUY" | "WAIT">;
        mockRecommendation?: AnalysisRecommendation;
        // false면 가격 변화 추이·감가 상각률을 조회하지 않음(판매 관리처럼 차트를 숨기는 화면)
        chartsEnabled?: boolean;
    },
) {
    const enabled = options?.enabled ?? true;
    const summaryEnabled = enabled && (options?.summaryEnabled ?? true);
    const perspective = options?.perspective ?? "SELL";
    const buyerRecommendation = options?.buyerRecommendation;
    const mockRecommendation = options?.mockRecommendation ?? buyerRecommendation;

    const productSummary = useProductSummaryQuery(productId, { enabled: summaryEnabled });
    const productAnalysis = useProductAnalysisQuery(productId, {
        enabled,
        perspective,
        mockRecommendation,
    });
    const chartsEnabled = enabled && (options?.chartsEnabled ?? true);
    const productPriceTrend = useProductPriceTrendQuery(productId, { enabled: chartsEnabled });
    const productValuationForecast = useProductValuationForecastQuery(productId, {
        enabled: chartsEnabled,
    });
    const productCompetition = useProductCompetitionQuery(productId, { enabled, perspective });

    return {
        productSummary,
        productAnalysis,
        productPriceTrend,
        productValuationForecast,
        productCompetition,
    };
}
