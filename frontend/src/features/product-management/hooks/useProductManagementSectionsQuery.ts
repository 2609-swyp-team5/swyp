"use client";

import {
    useProductAnalysisEmptyStateQuery,
    useProductAnalysisQuery,
} from "./useProductAnalysisQuery";
import { useProductCompetitionQuery } from "./useProductCompetitionQuery";
import { useProductPriceTrendQuery } from "./useProductPriceTrendQuery";
import { useProductPriceDistributionQuery } from "./useProductPriceDistributionQuery";
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
        analysisDetailsEnabled?: boolean;
        competitionEnabled?: boolean;
    },
) {
    const enabled = options?.enabled ?? true;
    const summaryEnabled = enabled && (options?.summaryEnabled ?? true);
    const analysisEnabled = enabled && (options?.analysisEnabled ?? true);
    // 기존 관심/검색 상세 화면은 분석 상세를 즉시 보여주므로 기본값을 유지한다.
    // 판매 상품 관리 화면만 이 값을 false로 내려 접힌 상태에서 상세 API를 지연 호출한다.
    const analysisDetailsEnabled = enabled && (options?.analysisDetailsEnabled ?? analysisEnabled);
    const competitionEnabled = enabled && (options?.competitionEnabled ?? true);
    const perspective = options?.perspective ?? "SELL";

    const productSummary = useProductSummaryQuery(productId, { enabled: summaryEnabled });
    const productAnalysis = useProductAnalysisQuery(productId, {
        enabled: analysisEnabled,
        perspective,
    });
    // 결과가 없을 때의 이유(같은 요청을 함께 쓴다)
    const productAnalysisEmptyState = useProductAnalysisEmptyStateQuery(productId, {
        enabled: analysisEnabled,
        perspective,
    });
    const productPriceTrend = useProductPriceTrendQuery(productId, {
        enabled: analysisDetailsEnabled,
    });
    const productPriceDistribution = useProductPriceDistributionQuery(productId, {
        enabled: analysisDetailsEnabled,
    });
    const productValuationForecast = useProductValuationForecastQuery(productId, {
        enabled: analysisDetailsEnabled,
    });
    const productCompetition = useProductCompetitionQuery(productId, {
        enabled: competitionEnabled && analysisDetailsEnabled,
        perspective,
    });

    return {
        productSummary,
        productAnalysis,
        productAnalysisEmptyState,
        productPriceTrend,
        productPriceDistribution,
        productValuationForecast,
        productCompetition,
    };
}
