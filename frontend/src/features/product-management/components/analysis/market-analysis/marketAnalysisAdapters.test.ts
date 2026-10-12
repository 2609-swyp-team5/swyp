import { expect, it } from "vitest";

import {
    createProductMarketAnalysisMock,
    createProductPriceTrendMock,
    createProductValuationForecastMock,
} from "../../../mocks/productManagementMock";
import {
    toPriceDistributionViewModel,
    toPriceTrendChartData,
    toValuationForecastChartData,
} from "./marketAnalysisAdapters";

it("가격 분포는 최저가·평균 거래가·추천가·최고가를 각각 보존한다", () => {
    const analysis = createProductMarketAnalysisMock(1, "SELL", "HOLD");

    expect(toPriceDistributionViewModel(analysis)).toEqual({
        minPrice: 180000,
        averagePrice: 274000,
        suggestedPrice: 468000,
        maxPrice: 420000,
    });
    expect(analysis.marketExpectedPrice).toBe(308000);
});

it("가격 추이는 API의 일별 포인트를 월 집계하지 않고 차트 모델로 변환한다", () => {
    const trend = createProductPriceTrendMock(1);
    const data = toPriceTrendChartData(trend.priceTrend);

    expect(data.points).toHaveLength(trend.priceTrend.points.length);
    expect(data.points[0]).toMatchObject({
        date: "2026-09-02",
        dateLabel: "9/2",
        tooltipDateLabel: "2026년 9월 2일",
        averagePrice: 259000,
    });
    expect(data.totalTransactionCount).toBe(trend.priceTrend.totalTransactionCount);
});

it("감가 상각률은 현재·1개월·3개월·6개월 순서로 매핑한다", () => {
    const forecast = createProductValuationForecastMock(1);
    const data = toValuationForecastChartData(forecast.valuationForecast);

    expect(data.points.map((point) => point.period)).toEqual([
        "현재",
        "1개월 후",
        "3개월 후",
        "6개월 후",
    ]);
    expect(data.points.map((point) => point.valueRate)).toEqual([100, 97.08, 91.61, 84.67]);
});
