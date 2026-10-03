import {
    createProductCompetitionMock,
    createProductMarketAnalysisMock,
    createProductPriceTrendMock,
    createProductSummaryMock,
    createProductValuationForecastMock,
} from "../mocks/productManagementMock";
import type { ProductDetailSummaryResponse } from "../schemas/productManagementResponseSchema";
import type {
    ProductCompetition,
    ProductMarketAnalysis,
    ProductManagementPerspective,
    ProductPriceTrend,
    ProductValuationForecast,
    AnalysisRecommendation,
} from "../types";

const mockResponseDelayMs = {
    marketAnalysis: 500,
    priceTrend: 900,
    valuationForecast: 700,
    competition: 650,
} as const;

function waitForMockResponse(delayMs: number) {
    return new Promise<void>((resolve) => window.setTimeout(resolve, delayMs));
}

export async function getProductSummaryMock(
    productId: number,
): Promise<ProductDetailSummaryResponse> {
    await waitForMockResponse(mockResponseDelayMs.marketAnalysis);

    return createProductSummaryMock(productId);
}

export async function getProductMarketAnalysisMock(
    productId: number,
    perspective: ProductManagementPerspective = "SELL",
    recommendation?: AnalysisRecommendation,
): Promise<ProductMarketAnalysis> {
    // Keep the independent loading state visible until the real endpoint replaces this adapter.
    await waitForMockResponse(mockResponseDelayMs.marketAnalysis);

    return createProductMarketAnalysisMock(productId, perspective, recommendation);
}

export async function getProductPriceTrendMock(productId: number): Promise<ProductPriceTrend> {
    await waitForMockResponse(mockResponseDelayMs.priceTrend);

    return createProductPriceTrendMock(productId);
}

export async function getProductValuationForecastMock(
    productId: number,
): Promise<ProductValuationForecast> {
    await waitForMockResponse(mockResponseDelayMs.valuationForecast);

    return createProductValuationForecastMock(productId);
}

export async function getProductCompetitionMock(
    productId: number,
    perspective: ProductManagementPerspective = "SELL",
): Promise<ProductCompetition> {
    await waitForMockResponse(mockResponseDelayMs.competition);

    return createProductCompetitionMock(productId, perspective);
}
