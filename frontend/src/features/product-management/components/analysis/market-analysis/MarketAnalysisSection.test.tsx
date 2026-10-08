import { render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";

import { createProductMarketAnalysisMock } from "../../../mocks/productManagementMock";
import { MarketAnalysisSection } from "./MarketAnalysisSection";

vi.mock("next/image", () => ({
    default: ({ alt }: { alt: string }) => <span role="img" aria-label={alt} />,
}));

const idleQuery = { data: undefined, error: null, isPending: false } as never;

it("판매자 전체 보기는 추천·가격·차트 정보를 함께 보여준다", () => {
    const analysis = createProductMarketAnalysisMock(1, "SELL", "HOLD");

    render(
        <MarketAnalysisSection
            result={analysis}
            error={null}
            isPending={false}
            priceTrendQuery={idleQuery}
            valuationForecastQuery={idleQuery}
        />,
    );

    expect(screen.getByText("HOLD")).toBeInTheDocument();
    expect(screen.getByText(analysis.description)).toBeInTheDocument();
    for (const visible of ["AI 추천 가격", "중고시세", "가격 변화 추이", "감가 상각률"]) {
        expect(screen.getByText(visible)).toBeInTheDocument();
    }
});

it("구매자 전체 보기는 구매 가격과 차트 정보를 함께 보여준다", () => {
    const analysis = createProductMarketAnalysisMock(1, "BUY", "BUY");

    render(
        <MarketAnalysisSection
            result={analysis}
            error={null}
            isPending={false}
            priceTrendQuery={idleQuery}
            valuationForecastQuery={idleQuery}
        />,
    );

    expect(screen.getByText("BUY")).toBeInTheDocument();
    expect(screen.getByText(analysis.description)).toBeInTheDocument();
    for (const visible of ["구매 고려 가격", "최근 평균 거래가", "가격 변화 추이", "감가 상각률"]) {
        expect(screen.getByText(visible)).toBeInTheDocument();
    }
});

it("분석 결과가 없으면 안내 문구를 보여준다", () => {
    render(
        <MarketAnalysisSection
            result={null}
            error={null}
            isPending={false}
            priceTrendQuery={idleQuery}
            valuationForecastQuery={idleQuery}
        />,
    );

    expect(screen.getByText(/아직 시세 분석 결과가 없어요/)).toBeInTheDocument();
});
