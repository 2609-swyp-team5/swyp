import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { createProductMarketAnalysisMock } from "../../../mocks/productManagementMock";
import { describeDiffFromMarket } from "./formatters";
import { MarketAnalysisSummaryMetrics } from "./MarketAnalysisSummaryMetrics";

describe("describeDiffFromMarket", () => {
    it("says whether the current price is above or below the market", () => {
        expect(describeDiffFromMarket(12)).toBe("시세보다 12.0% 높아요");
        expect(describeDiffFromMarket(-8.64)).toBe("시세보다 8.6% 낮아요");
        expect(describeDiffFromMarket(0.04)).toBe("시세와 같아요");
        expect(describeDiffFromMarket(null)).toBeNull();
    });
});

describe("MarketAnalysisSummaryMetrics", () => {
    // 시세 대비 차이는 현재 판매가 기준이라 추천가가 아닌 현재 판매가 칸에 붙는다(추천가가 비싸거나 싸다고 읽히지 않게)
    it("puts the market difference under the current price, not the recommended price", () => {
        const analysis = {
            ...createProductMarketAnalysisMock(1, "BUY", "BUY"),
            marketPriceDiffRate: -8.6,
        };

        render(<MarketAnalysisSummaryMetrics analysis={analysis} variant="management" />);

        const currentPrice = screen.getByText("현재 판매가").parentElement!;
        expect(within(currentPrice).getByText("시세보다 8.6% 낮아요")).toBeInTheDocument();
        const suggestedPrice = screen.getByText("AI 추천 구매가").parentElement!;
        expect(within(suggestedPrice).queryByText(/시세/)).not.toBeInTheDocument();
    });
});
