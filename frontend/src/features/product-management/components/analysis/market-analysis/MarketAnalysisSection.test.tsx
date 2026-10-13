import { fireEvent, render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";

import {
    createProductCompetitionMock,
    createProductMarketAnalysisMock,
    createProductPriceDistributionMock,
} from "../../../mocks/productManagementMock";
import { MarketAnalysisSection } from "./MarketAnalysisSection";

vi.mock("next/image", () => ({
    default: ({ alt }: { alt: string }) => <span role="img" aria-label={alt} />,
}));

const idleQuery = { data: undefined, error: null, isPending: false } as never;

it("판매자 전체 보기는 추천·가격·차트 정보를 함께 보여준다", () => {
    const analysis = createProductMarketAnalysisMock(1, "SELL", "HOLD");
    const priceDistributionQuery = {
        data: createProductPriceDistributionMock(1),
        error: null,
        isPending: false,
        isFetching: false,
        refetch: vi.fn(),
    } as never;

    render(
        <MarketAnalysisSection
            result={analysis}
            error={null}
            isPending={false}
            priceTrendQuery={idleQuery}
            valuationForecastQuery={idleQuery}
            priceDistributionQuery={priceDistributionQuery}
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
        "46.8만 원",
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

it("관리 화면의 분석 대기 카드는 구매·판매 타이밍 문구를 구분한다", () => {
    const { rerender } = render(
        <MarketAnalysisSection
            result={null}
            error={null}
            isPending={false}
            priceTrendQuery={idleQuery}
            valuationForecastQuery={idleQuery}
            perspective="BUY"
            variant="management"
        />,
    );

    expect(screen.getByText("구매 타이밍을 분석하고 있어요")).toBeInTheDocument();
    expect(screen.queryByText("아직 시세 분석 결과가 없어요.")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "분석 다시 시도" })).not.toBeInTheDocument();
    expect(screen.queryByText("상세 시세 분석 보기")).not.toBeInTheDocument();
    expect(screen.queryByText("더보기")).not.toBeInTheDocument();

    rerender(
        <MarketAnalysisSection
            result={null}
            error={null}
            isPending={false}
            priceTrendQuery={idleQuery}
            valuationForecastQuery={idleQuery}
            perspective="SELL"
            variant="management"
        />,
    );

    expect(screen.getByText("판매 타이밍을 분석하고 있어요")).toBeInTheDocument();
    expect(screen.queryByText("상세 시세 분석 보기")).not.toBeInTheDocument();
    expect(screen.queryByText("더보기")).not.toBeInTheDocument();
});

it("관리 화면은 접힌 추천 카드와 3열 가격 metric을 먼저 보여준다", () => {
    const analysis = createProductMarketAnalysisMock(1, "SELL", "SELL");
    const competitionQuery = {
        data: createProductCompetitionMock(1),
        error: null,
        isPending: false,
        isFetching: false,
        refetch: vi.fn(),
    } as never;

    render(
        <MarketAnalysisSection
            result={analysis}
            error={null}
            isPending={false}
            priceTrendQuery={idleQuery}
            valuationForecastQuery={idleQuery}
            variant="management"
            competitionQuery={competitionQuery}
            analysisRetry={{ isFetching: false, refetch: vi.fn() }}
        />,
    );

    expect(screen.getByText("AI 추천 판매가")).toBeInTheDocument();
    expect(screen.getByText("현재 판매가")).toBeInTheDocument();
    expect(screen.getByText("최근 평균 등록가")).toBeInTheDocument();
    expect(screen.queryByText("거래 가격 분포")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /상세 시세 분석 보기/ }));

    expect(screen.getByText("거래 가격 분포")).toBeInTheDocument();
    expect(screen.getByText("경쟁 상품 수")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /내용 접기/ }));
    expect(screen.queryByText("거래 가격 분포")).not.toBeInTheDocument();
});

it("관리 화면 헤더의 AI 분석 재시도 버튼은 분석 요청을 호출한다", () => {
    const request = vi.fn().mockResolvedValue(undefined);
    const analysis = createProductMarketAnalysisMock(1, "SELL", "SELL");

    render(
        <MarketAnalysisSection
            result={analysis}
            error={null}
            isPending={false}
            priceTrendQuery={idleQuery}
            valuationForecastQuery={idleQuery}
            variant="management"
            analysisRetry={{ isFetching: false, refetch: vi.fn(), request }}
        />,
    );

    fireEvent.click(screen.getByRole("button", { name: "AI 분석 재시도" }));

    expect(request).toHaveBeenCalledTimes(1);
});

it.each([
    ["HOLD", "추천 대기 기간", "SELL"],
    ["WAIT", "구매 대기 기간", "BUY"],
] as const)(
    "관리 화면의 %s 추천은 대기 metric을 보여준다",
    (recommendation, waitLabel, perspective) => {
        const analysis = createProductMarketAnalysisMock(1, perspective, recommendation);

        render(
            <MarketAnalysisSection
                result={analysis}
                error={null}
                isPending={false}
                priceTrendQuery={idleQuery}
                valuationForecastQuery={idleQuery}
                variant="management"
            />,
        );

        expect(screen.getByText(waitLabel)).toHaveClass("text-[#6653fb]");
        expect(screen.getByText("예상 가격 변화")).toBeInTheDocument();
        expect(screen.getByText("신뢰도")).toBeInTheDocument();
        expect(screen.queryByText("AI 추천 판매가")).not.toBeInTheDocument();
    },
);

it("관리 화면의 HOLD 추천에는 추천 가격 변경 액션을 표시하지 않는다", () => {
    const analysis = createProductMarketAnalysisMock(1, "SELL", "HOLD");

    render(
        <MarketAnalysisSection
            result={analysis}
            error={null}
            isPending={false}
            priceTrendQuery={idleQuery}
            valuationForecastQuery={idleQuery}
            variant="management"
            canChangeRecommendedPrice
            onRecommendedPriceChange={vi.fn().mockResolvedValue(undefined)}
        />,
    );

    expect(screen.queryByRole("button", { name: "추천 가격으로 변경" })).not.toBeInTheDocument();
});

it("관리 화면의 BUY 추천은 추천가를 구매가로 표시한다", () => {
    const analysis = createProductMarketAnalysisMock(1, "BUY", "BUY");

    render(
        <MarketAnalysisSection
            result={analysis}
            error={null}
            isPending={false}
            priceTrendQuery={idleQuery}
            valuationForecastQuery={idleQuery}
            variant="management"
        />,
    );

    expect(screen.getByText("AI 추천 구매가")).toBeInTheDocument();
    expect(screen.queryByText("AI 추천 판매가")).not.toBeInTheDocument();
});

it("관리형 구매 분석에는 구매 고려 가격 액션을 표시하지 않는다", () => {
    const analysis = createProductMarketAnalysisMock(1, "BUY", "BUY");

    render(
        <MarketAnalysisSection
            result={analysis}
            error={null}
            isPending={false}
            priceTrendQuery={idleQuery}
            valuationForecastQuery={idleQuery}
            variant="management"
        />,
    );

    expect(screen.queryByText("구매 고려 가격")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /추천 가격으로 변경/ })).not.toBeInTheDocument();
});

it("판매 완료 상품에는 추천 가격 변경 액션을 표시하지 않는다", () => {
    const analysis = createProductMarketAnalysisMock(1, "SELL", "SELL");

    render(
        <MarketAnalysisSection
            result={analysis}
            error={null}
            isPending={false}
            priceTrendQuery={idleQuery}
            valuationForecastQuery={idleQuery}
            variant="management"
            canChangeRecommendedPrice={false}
            onRecommendedPriceChange={vi.fn().mockResolvedValue(undefined)}
        />,
    );

    expect(screen.queryByRole("button", { name: /추천 가격으로 변경/ })).not.toBeInTheDocument();
});

it("판매완료 상품은 추천 요약 없이 상세 시세 분석을 접어 보여준다", () => {
    const analysis = createProductMarketAnalysisMock(1, "SELL", "SELL");
    const competitionQuery = {
        data: createProductCompetitionMock(1),
        error: null,
        isPending: false,
        isFetching: false,
        refetch: vi.fn(),
    } as never;

    render(
        <MarketAnalysisSection
            result={analysis}
            error={null}
            isPending={false}
            priceTrendQuery={idleQuery}
            valuationForecastQuery={idleQuery}
            variant="sold"
            competitionQuery={competitionQuery}
        />,
    );

    expect(screen.getByRole("button", { name: /상세 시세 분석 보기/ })).toBeInTheDocument();
    expect(screen.queryByText("AI 추천 판매가")).not.toBeInTheDocument();
    expect(screen.queryByText("거래 가격 분포")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /상세 시세 분석 보기/ }));

    expect(screen.getByText("거래 가격 분포")).toBeInTheDocument();
    expect(screen.queryByText("경쟁 상품 수")).not.toBeInTheDocument();
});

it("관리 화면의 로딩·분석 대기·오류 상태를 구분한다", () => {
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

    expect(screen.getByLabelText("AI 시세 분석을 불러오는 중")).toBeInTheDocument();

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
    expect(screen.getByText("판매 타이밍을 분석하고 있어요")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "분석 다시 시도" })).not.toBeInTheDocument();
    expect(screen.queryByText("상세 시세 분석 보기")).not.toBeInTheDocument();
    expect(screen.queryByText("더보기")).not.toBeInTheDocument();

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

it("추천 가격 변경이 완료되면 임시 toast를 보여준다", async () => {
    const onRecommendedPriceChange = vi.fn().mockResolvedValue(undefined);
    const analysis = createProductMarketAnalysisMock(1, "SELL", "SELL");

    render(
        <MarketAnalysisSection
            result={analysis}
            error={null}
            isPending={false}
            priceTrendQuery={idleQuery}
            valuationForecastQuery={idleQuery}
            variant="management"
            onRecommendedPriceChange={onRecommendedPriceChange}
        />,
    );

    fireEvent.click(screen.getByRole("button", { name: "추천 가격으로 변경" }));

    expect(onRecommendedPriceChange).toHaveBeenCalledTimes(1);
    expect(await screen.findByRole("status")).toHaveTextContent("추천 가격으로 변경했습니다!");
    expect(
        screen.getByText("AI가 가격 변화를 추적하고 좋은 시점에 알려드릴게요."),
    ).toBeInTheDocument();
    expect(await screen.findByRole("status")).toHaveTextContent("추천 가격");
    expect(await screen.findByRole("status")).toHaveTextContent("468,000원");
    expect(screen.queryByRole("button", { name: "확인" })).not.toBeInTheDocument();
});
