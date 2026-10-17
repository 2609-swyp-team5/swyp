import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { createProductMarketAnalysisMock } from "../../../mocks/productManagementMock";
import {
    describeAnalysisBasis,
    MarketAnalysisRecommendation,
} from "./MarketAnalysisRecommendation";

vi.mock("next/image", () => ({
    default: ({ alt }: { alt: string }) => <span role="img" aria-label={alt} />,
}));

describe("describeAnalysisBasis", () => {
    it("joins listing count, confidence and the related-items basis", () => {
        const analysis = createProductMarketAnalysisMock(1, "BUY", "BUY");

        expect(
            describeAnalysisBasis({
                ...analysis,
                listingCount: 12,
                confidenceRate: 60,
                comparisonBasis: "RELATED",
            }),
        ).toBe("비교 매물 12건 · 신뢰도 60% · 비슷한 상품 기준");
        expect(
            describeAnalysisBasis({
                ...analysis,
                listingCount: 30,
                confidenceRate: 100,
                comparisonBasis: "SAME",
            }),
        ).toBe("비교 매물 30건 · 신뢰도 100%");
        // 신뢰도 도입 전 분석은 근거 줄을 숨긴다
        expect(
            describeAnalysisBasis({
                ...analysis,
                listingCount: null,
                confidenceRate: null,
                comparisonBasis: null,
            }),
        ).toBeNull();
    });
});

describe("MarketAnalysisRecommendation", () => {
    it("shows the basis under the recommendation so a weak recommendation stands out", () => {
        const analysis = {
            ...createProductMarketAnalysisMock(1, "BUY", "BUY"),
            listingCount: 3,
            confidenceRate: 15,
            comparisonBasis: "RELATED" as const,
        };

        render(<MarketAnalysisRecommendation analysis={analysis} variant="management" />);

        expect(screen.getByText("지금 구매를 추천해요!")).toBeInTheDocument();
        expect(
            screen.getByText("비교 매물 3건 · 신뢰도 15% · 비슷한 상품 기준"),
        ).toBeInTheDocument();
    });
});
