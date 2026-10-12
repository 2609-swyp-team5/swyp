import { fireEvent, render, screen } from "@testing-library/react";
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
    for (const visible of [
        "AI 추천 가격",
        "거래 가격 분포",
        "비슷한 상품의 가격과 비교해 보세요.",
        "18만 원",
        "27.4만 원",
        "42만 원",
        "30.8만 원",
    ]) {
        expect(screen.getAllByText(visible).length).toBeGreaterThan(0);
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
    for (const visible of ["구매 고려 가격", "최근 평균 거래가"]) {
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

it("관리 화면은 접힌 추천 카드와 3열 가격 metric을 먼저 보여준다", () => {
    const analysis = createProductMarketAnalysisMock(1, "SELL", "SELL");

    render(
        <MarketAnalysisSection
            result={analysis}
            error={null}
            isPending={false}
            priceTrendQuery={idleQuery}
            valuationForecastQuery={idleQuery}
            variant="management"
            analysisRetry={{ isFetching: false, refetch: vi.fn() }}
        />,
    );

    expect(screen.getByText("AI 추천 판매가")).toBeInTheDocument();
    expect(screen.getByText("현재 판매가")).toBeInTheDocument();
    expect(screen.getByText("최근 평균 등록가")).toBeInTheDocument();
    expect(screen.queryByText("거래 가격 분포")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /상세 시세 분석 보기/ }));

    expect(screen.getByText("거래 가격 분포")).toBeInTheDocument();
});

it("관리 화면의 로딩·결과 없음·오류 상태를 구분하고 재시도한다", () => {
    const refetch = vi.fn().mockResolvedValue(undefined);
    const { rerender } = render(
        <MarketAnalysisSection
            result={undefined}
            error={null}
            isPending
            priceTrendQuery={idleQuery}
            valuationForecastQuery={idleQuery}
            variant="management"
            analysisRetry={{ isFetching: false, refetch }}
        />,
    );

    expect(screen.getByText("AI 시세 분석 대기 중이에요.")).toBeInTheDocument();

    rerender(
        <MarketAnalysisSection
            result={null}
            error={null}
            isPending={false}
            priceTrendQuery={idleQuery}
            valuationForecastQuery={idleQuery}
            variant="management"
            analysisRetry={{ isFetching: false, refetch }}
        />,
    );
    expect(screen.getByText("아직 시세 분석 결과가 없어요.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "분석 다시 시도" }));
    expect(refetch).toHaveBeenCalledTimes(1);

    rerender(
        <MarketAnalysisSection
            result={undefined}
            error={new Error("network error")}
            isPending={false}
            priceTrendQuery={idleQuery}
            valuationForecastQuery={idleQuery}
            variant="management"
            analysisRetry={{ isFetching: false, refetch }}
        />,
    );
    expect(screen.getByText("network error")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "다시 시도" })).toBeInTheDocument();
});
