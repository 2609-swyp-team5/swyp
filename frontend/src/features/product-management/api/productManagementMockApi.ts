import {
    createProductCompetitionMock,
    createProductMarketAnalysisMock,
    createProductPriceTrendMock,
    createProductTransactionsMock,
    createProductValuationForecastMock,
    productManagementMockSource,
} from "../mocks/productManagementMock";
import type {
    ProductCompetition,
    ProductMarketAnalysis,
    ProductMarketAnalysisDataSource,
    ProductManagementPerspective,
    ProductPriceTrend,
    ProductTransactions,
    ProductValuationForecast,
} from "../types";

const mockResponseDelayMs = {
    marketAnalysis: 500,
    priceTrend: 900,
    valuationForecast: 700,
    transactions: 1200,
    competition: 650,
} as const;

export type ProductManagementMockResult<T> = {
    source: ProductMarketAnalysisDataSource;
    data: T;
};

export type ProductMarketAnalysisResult = ProductManagementMockResult<ProductMarketAnalysis>;
export type ProductPriceTrendResult = ProductManagementMockResult<ProductPriceTrend>;
export type ProductValuationForecastResult = ProductManagementMockResult<ProductValuationForecast>;
export type ProductTransactionsResult = ProductManagementMockResult<ProductTransactions>;
export type ProductCompetitionResult = ProductManagementMockResult<ProductCompetition>;

function waitForMockResponse(delayMs: number) {
    return new Promise<void>((resolve) => window.setTimeout(resolve, delayMs));
}

export async function getProductMarketAnalysisMock(
    productId: number,
    perspective: ProductManagementPerspective = "SELL",
): Promise<ProductMarketAnalysisResult> {
    // Keep the independent loading state visible until the real endpoint replaces this adapter.
    await waitForMockResponse(mockResponseDelayMs.marketAnalysis);

    return {
        source: productManagementMockSource,
        data: createProductMarketAnalysisMock(productId, perspective),
    };
}

export async function getProductPriceTrendMock(
    productId: number,
): Promise<ProductPriceTrendResult> {
    await waitForMockResponse(mockResponseDelayMs.priceTrend);

    return {
        source: productManagementMockSource,
        data: createProductPriceTrendMock(productId),
    };
}

export async function getProductValuationForecastMock(
    productId: number,
): Promise<ProductValuationForecastResult> {
    await waitForMockResponse(mockResponseDelayMs.valuationForecast);

    return {
        source: productManagementMockSource,
        data: createProductValuationForecastMock(productId),
    };
}

export async function getProductTransactionsMock(
    productId: number,
): Promise<ProductTransactionsResult> {
    await waitForMockResponse(mockResponseDelayMs.transactions);

    return {
        source: productManagementMockSource,
        data: createProductTransactionsMock(productId),
    };
}

export async function getProductCompetitionMock(
    productId: number,
    perspective: ProductManagementPerspective = "SELL",
): Promise<ProductCompetitionResult> {
    await waitForMockResponse(mockResponseDelayMs.competition);

    return {
        source: productManagementMockSource,
        data: createProductCompetitionMock(productId, perspective),
    };
}
