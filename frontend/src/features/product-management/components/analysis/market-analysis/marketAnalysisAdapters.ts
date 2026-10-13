import type {
    ProductMarketAnalysis,
    ProductPriceDistribution,
    ProductPriceTrend,
    ProductValuationForecast,
} from "../../../types";

export type PriceDistributionViewModel = {
    minPrice: number;
    averagePrice: number;
    suggestedPrice: number;
    maxPrice: number;
};

export function toPriceDistributionViewModel(
    analysis: ProductMarketAnalysis,
    distribution: ProductPriceDistribution,
): PriceDistributionViewModel | null {
    if (
        distribution.minPrice === null ||
        distribution.averagePrice === null ||
        distribution.maxPrice === null
    ) {
        return null;
    }

    return {
        minPrice: distribution.minPrice,
        averagePrice: distribution.averagePrice,
        suggestedPrice: analysis.suggestedPrice,
        maxPrice: distribution.maxPrice,
    };
}

export type PriceTrendChartPoint = {
    date: string;
    dateLabel: string;
    tooltipDateLabel: string;
    averagePrice: number;
    transactionCount: number;
    change: {
        amount: number;
        rate: number;
        comparedDateLabel: string;
    } | null;
};

export type PriceTrendChartData = {
    points: PriceTrendChartPoint[];
    totalTransactionCount: number;
    isLatestHighest: boolean;
};

function formatDateLabel(date: string) {
    const [, month, day] = date.split("-");
    return `${Number(month)}/${Number(day)}`;
}

function formatTooltipDateLabel(date: string) {
    const [year, month, day] = date.split("-");
    return `${year}년 ${Number(month)}월 ${Number(day)}일`;
}

export function toPriceTrendChartData(trend: ProductPriceTrend["priceTrend"]): PriceTrendChartData {
    const points = trend.points.map((point) => ({
        date: point.date,
        dateLabel: formatDateLabel(point.date),
        tooltipDateLabel: formatTooltipDateLabel(point.date),
        averagePrice: point.averagePrice,
        transactionCount: point.transactionCount,
        change: point.change
            ? {
                  amount: point.change.amount,
                  rate: point.change.rate,
                  comparedDateLabel: formatTooltipDateLabel(point.change.comparedDate),
              }
            : null,
    }));
    const latestPoint = points.at(-1);

    return {
        points,
        totalTransactionCount: trend.totalTransactionCount,
        isLatestHighest:
            latestPoint !== undefined &&
            latestPoint.averagePrice === Math.max(...points.map((point) => point.averagePrice)),
    };
}

export type ValuationForecastChartPoint = {
    period: "현재" | "1개월 후" | "3개월 후" | "6개월 후";
    valueRate: number;
    expectedValue: number;
    expectedChangeRate: number;
    isCurrent: boolean;
    rateLabel: string;
};

export type ValuationForecastChartData = {
    points: ValuationForecastChartPoint[];
};

const forecastPeriodLabels = {
    "1M": "1개월 후",
    "3M": "3개월 후",
    "6M": "6개월 후",
} as const;

export function toValuationForecastChartData(
    forecast: ProductValuationForecast["valuationForecast"],
): ValuationForecastChartData {
    const currentPoint: ValuationForecastChartPoint = {
        period: "현재",
        valueRate: forecast.baseValueRate,
        expectedValue: forecast.baseValue,
        expectedChangeRate: 0,
        isCurrent: true,
        rateLabel: `${Math.round(forecast.baseValueRate)}%`,
    };

    const forecastPoints = forecast.forecasts
        .filter((item) => item.period in forecastPeriodLabels)
        .map((item) => ({
            period: forecastPeriodLabels[item.period as keyof typeof forecastPeriodLabels],
            valueRate: item.expectedValueRate,
            expectedValue: item.expectedValue,
            expectedChangeRate: item.expectedChangeRate,
            isCurrent: false,
            rateLabel: `${Math.round(item.expectedValueRate)}%`,
        }));

    return { points: [currentPoint, ...forecastPoints] };
}
