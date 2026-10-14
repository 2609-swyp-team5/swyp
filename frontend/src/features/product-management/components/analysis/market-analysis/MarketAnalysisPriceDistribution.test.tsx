import { fireEvent, render, screen } from "@testing-library/react";
import { expect, it } from "vitest";

import { createProductPriceDistributionMock } from "../../../mocks/productManagementMock";
import { MarketAnalysisPriceDistribution } from "./MarketAnalysisPriceDistribution";

function queryFor(data = createProductPriceDistributionMock(1)) {
    return { data, error: null, isPending: false } as never;
}

// 막대 안쪽 영역에서의 위치 비율(0~1)을 style.left의 calc 식에서 꺼낸다.
function ratioOf(testId: string) {
    const match = /\+ ([\d.]+) \*|\* ([\d.]+)\)/.exec(screen.getByTestId(testId).style.left);
    return Number(match?.[1] ?? match?.[2]);
}

it("최저·평균·최고·추천 가격을 모두 점으로 표시한다", () => {
    render(
        <MarketAnalysisPriceDistribution
            query={queryFor({
                ...createProductPriceDistributionMock(1),
                onSale: {
                    ...createProductPriceDistributionMock(1).onSale,
                    minPrice: 200000,
                    averagePrice: 240000,
                    suggestedPrice: 220000,
                    maxPrice: 280000,
                },
            })}
        />,
    );

    for (const key of ["min", "average", "max", "suggested"]) {
        expect(screen.getByTestId(`price-distribution-point-${key}`)).toBeInTheDocument();
    }
    for (const label of ["최저", "평균", "최고"]) {
        expect(screen.getByText(label)).toBeInTheDocument();
    }
    expect(ratioOf("price-distribution-point-suggested")).toBe(0.25);
});

it("추천가가 최저가보다 낮으면 눈금 범위를 넓혀 막대 안에 둔다", () => {
    render(
        <MarketAnalysisPriceDistribution
            query={queryFor({
                ...createProductPriceDistributionMock(1),
                onSale: {
                    ...createProductPriceDistributionMock(1).onSale,
                    minPrice: 20000,
                    averagePrice: 24000,
                    suggestedPrice: 19000,
                    maxPrice: 27000,
                },
            })}
        />,
    );

    expect(ratioOf("price-distribution-point-suggested")).toBe(0);
    expect(ratioOf("price-distribution-point-min")).toBe(0.125);
    expect(ratioOf("price-distribution-point-max")).toBe(1);
});

it("눈금선은 최저·평균·최고 점과 같은 위치에 그린다", () => {
    render(
        <MarketAnalysisPriceDistribution
            query={queryFor({
                ...createProductPriceDistributionMock(1),
                onSale: {
                    ...createProductPriceDistributionMock(1).onSale,
                    minPrice: 20000,
                    averagePrice: 24000,
                    suggestedPrice: 19000,
                    maxPrice: 27000,
                },
            })}
        />,
    );

    for (const key of ["min", "average", "max"]) {
        expect(ratioOf(`price-distribution-tick-${key}`)).toBe(
            ratioOf(`price-distribution-point-${key}`),
        );
    }
});

it("모든 가격이 같으면 가운데에 표시한다", () => {
    render(
        <MarketAnalysisPriceDistribution
            query={queryFor({
                ...createProductPriceDistributionMock(1),
                onSale: {
                    ...createProductPriceDistributionMock(1).onSale,
                    minPrice: 10000,
                    averagePrice: 10000,
                    suggestedPrice: 10000,
                    maxPrice: 10000,
                },
            })}
        />,
    );

    expect(ratioOf("price-distribution-point-suggested")).toBe(0.5);
    expect(screen.getByText("최저")).toBeInTheDocument();
    expect(screen.queryByText("평균")).not.toBeInTheDocument();
});

it("판매 완료 탭을 누르면 같은 응답의 판매 완료 분포를 보여준다", () => {
    render(<MarketAnalysisPriceDistribution query={queryFor()} />);

    fireEvent.click(screen.getByRole("tab", { name: "판매 완료" }));

    expect(screen.getByText("16만 원")).toBeInTheDocument();
    expect(screen.getByText("25만 원")).toBeInTheDocument();
    expect(screen.getByText("39만 원")).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "판매 완료" })).toHaveAttribute("aria-selected", "true");
});
