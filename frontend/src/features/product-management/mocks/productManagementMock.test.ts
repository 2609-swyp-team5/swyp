import { describe, expect, it } from "vitest";

import {
    createProductMarketAnalysisMock,
    productManagementMockSource,
} from "./productManagementMock";

describe("product management analysis mock", () => {
    it("provides the expected response shape for the step 2 HOLD screen", () => {
        const analysis = createProductMarketAnalysisMock(42);

        expect(productManagementMockSource).toBe("mock");
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
});
