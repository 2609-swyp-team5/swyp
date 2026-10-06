import {
    createProductCompetitionMock,
    createProductMarketAnalysisMock,
    createProductPriceTrendMock,
    createProductSummaryMock,
    createProductValuationForecastMock,
} from "../mocks/productManagementMock";
import type {
    ProductDetailSummaryResponse,
    ProductTargetPriceResponse,
} from "../schemas/productManagementResponseSchema";
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

// mock 모드에서 상품별 목표 판매가(새로고침하면 초기화). 평균 시세는 등록가 기준 가상값.
const mockTargetPrices = new Map<number, number | null>();

function productTargetPriceMock(productId: number): ProductTargetPriceResponse {
    const targetPrice = mockTargetPrices.get(productId) ?? null;
    const averagePrice = createProductSummaryMock(productId).price;
    return {
        productId,
        targetPrice,
        averagePrice,
        reached: targetPrice !== null && averagePrice >= targetPrice,
    };
}

export async function getProductTargetPriceMock(productId: number) {
    await waitForMockResponse(mockResponseDelayMs.marketAnalysis);
    return productTargetPriceMock(productId);
}

export async function setProductTargetPriceMock(productId: number, targetPrice: number | null) {
    await waitForMockResponse(mockResponseDelayMs.marketAnalysis);
    mockTargetPrices.set(productId, targetPrice);
    return productTargetPriceMock(productId);
}
