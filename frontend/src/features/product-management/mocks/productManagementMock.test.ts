import { describe, expect, it } from "vitest";

import {
    createProductMarketAnalysisMock,
    createProductPriceTrendMock,
    createProductValuationForecastMock,
} from "./productManagementMock";

describe("product management analysis mock", () => {
    it("provides the expected response shape for the step 2 HOLD screen", () => {
        const analysis = createProductMarketAnalysisMock(42);

        expect(analysis).toMatchObject({
            productId: 42,
            analysisId: 5,
            recommendation: "HOLD",
            summary: {
                type: "WAIT_RECOMMENDATION",
                waitPeriodDays: 14,
                expectedPriceChangeRate: 8,
                confidenceScore: 88,
            },
        });
        expect(analysis.priceDistribution).not.toHaveLength(0);
    });

    it("returns independent nested data for each request", () => {
        const first = createProductMarketAnalysisMock(1);
        const second = createProductMarketAnalysisMock(2);

        first.priceDistribution[0].count = 99;

        expect(second.productId).toBe(2);
        expect(second.priceDistribution[0].count).toBe(2);
    });

    it("keeps the requested recommendation and summary aligned", () => {
        const sellAnalysis = createProductMarketAnalysisMock(3, "SELL", "SELL");

        expect(sellAnalysis).toMatchObject({
            recommendation: "SELL",
            summary: {
                type: "SALE_STATS",
            },
        });
    });

    it("provides 30 daily average-price points for the price trend chart", () => {
        const trend = createProductPriceTrendMock(42).priceTrend;

        expect(trend.period).toBe("1M");
        expect(trend.points).toHaveLength(30);
        expect(trend.points[0]).toMatchObject({
            date: "2026-09-02",
            averagePrice: 259000,
            change: null,
        });
        expect(trend.points.at(-1)).toMatchObject({
            date: "2026-10-01",
            averagePrice: 276000,
            change: { comparedDate: "2026-09-30", amount: 1000, rate: 0.36 },
        });
        expect(trend.totalTransactionCount).toBe(
            trend.points.reduce((total, point) => total + point.transactionCount, 0),
        );
    });

    it("provides current and 1, 3, and 6 month valuation forecasts", () => {
        const forecast = createProductValuationForecastMock(42).valuationForecast;

        expect(forecast.baseValueRate).toBe(100);
        expect(forecast.forecasts.map((item) => item.period)).toEqual(["1M", "3M", "6M"]);
        expect(forecast.forecasts.map((item) => item.expectedValue)).toEqual([
            266000, 251000, 232000,
        ]);
    });
});
