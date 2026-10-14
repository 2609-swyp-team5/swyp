import { render, screen } from "@testing-library/react";
import { expect, it } from "vitest";

import { MarketAnalysisPriceDistribution } from "./MarketAnalysisPriceDistribution";

// 막대 안쪽 영역에서의 위치 비율(0~1)을 style.left의 calc 식에서 꺼낸다.
function ratioOf(testId: string) {
    const match = /\+ ([\d.]+) \*|\* ([\d.]+)\)/.exec(screen.getByTestId(testId).style.left);
    return Number(match?.[1] ?? match?.[2]);
}

it("최저·평균·최고·추천 가격을 모두 점으로 표시한다", () => {
    render(
        <MarketAnalysisPriceDistribution
            data={{
                minPrice: 200000,
                averagePrice: 240000,
                suggestedPrice: 220000,
                maxPrice: 280000,
            }}
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
            data={{ minPrice: 20000, averagePrice: 24000, suggestedPrice: 19000, maxPrice: 27000 }}
        />,
    );

    expect(ratioOf("price-distribution-point-suggested")).toBe(0);
    expect(ratioOf("price-distribution-point-min")).toBe(0.125);
    expect(ratioOf("price-distribution-point-max")).toBe(1);
});

it("모든 가격이 같으면 가운데에 표시한다", () => {
    render(
        <MarketAnalysisPriceDistribution
            data={{ minPrice: 10000, averagePrice: 10000, suggestedPrice: 10000, maxPrice: 10000 }}
        />,
    );

    expect(ratioOf("price-distribution-point-suggested")).toBe(0.5);
    expect(screen.getByText("최저")).toBeInTheDocument();
    expect(screen.queryByText("평균")).not.toBeInTheDocument();
});
