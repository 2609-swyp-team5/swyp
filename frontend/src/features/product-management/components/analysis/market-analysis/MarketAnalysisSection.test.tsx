import { render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";

import { createProductMarketAnalysisMock } from "../../../mocks/productManagementMock";
import { MarketAnalysisSection } from "./MarketAnalysisSection";

vi.mock("next/image", () => ({
    default: ({ alt }: { alt: string }) => <span role="img" aria-label={alt} />,
}));

const idleQuery = { data: undefined, error: null, isPending: false } as never;
const saleStats = { salesDurationDays: 5, viewCount: 12, interestCount: 3 };

it("판매자 간단 보기는 추천 상태·사유와 판매 현황만 보여주고 가격·차트 정보는 숨긴다", () => {
    const analysis = createProductMarketAnalysisMock(1, "SELL", "HOLD");

    render(
        <MarketAnalysisSection
            result={analysis}
            error={null}
            isPending={false}
            priceTrendQuery={idleQuery}
            valuationForecastQuery={idleQuery}
            sellerSaleStats={saleStats}
        />,
    );

    expect(screen.getByText("HOLD")).toBeInTheDocument();
    expect(screen.getByText(analysis.description)).toBeInTheDocument();
    expect(screen.getByText("판매 기간")).toBeInTheDocument();
    expect(screen.getByText("5일")).toBeInTheDocument();
    expect(screen.getByText("조회수")).toBeInTheDocument();
    expect(screen.getByText("관심 수")).toBeInTheDocument();
    for (const hidden of ["AI 추천 가격", "중고시세", "가격 변화 추이", "감가 상각률"]) {
        expect(screen.queryByText(hidden)).not.toBeInTheDocument();
    }
});

it("분석 결과가 없어도 판매 현황은 보여준다", () => {
    render(
        <MarketAnalysisSection
            result={null}
            error={null}
            isPending={false}
            priceTrendQuery={idleQuery}
            valuationForecastQuery={idleQuery}
            sellerSaleStats={saleStats}
        />,
    );

    expect(screen.getByText(/아직 시세 분석 결과가 없어요/)).toBeInTheDocument();
    expect(screen.getByText("12")).toBeInTheDocument();
});

it("요약 보기는 추천 상태·사유와 요약 지표만 보여주고 가격·차트 정보는 숨긴다", () => {
    const analysis = createProductMarketAnalysisMock(1, "BUY", "BUY");

    render(
        <MarketAnalysisSection
            result={analysis}
            error={null}
            isPending={false}
            priceTrendQuery={idleQuery}
            valuationForecastQuery={idleQuery}
            summaryOnly
        />,
    );

    expect(screen.getByText("BUY")).toBeInTheDocument();
    expect(screen.getByText(analysis.description)).toBeInTheDocument();
    expect(screen.getByText("예상 가격 변화")).toBeInTheDocument();
    expect(screen.getByText("신뢰도")).toBeInTheDocument();
    for (const hidden of ["AI 추천 가격", "최근 평균 거래가", "가격 변화 추이", "감가 상각률"]) {
        expect(screen.queryByText(hidden)).not.toBeInTheDocument();
    }
});
