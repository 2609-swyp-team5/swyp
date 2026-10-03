"use client";

import {
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
    LabelList,
    ReferenceLine,
    XAxis,
    YAxis,
} from "recharts";

import { ChartContainer, ChartTooltip, type ChartConfig } from "@/common/components/ui/Chart";
import { cn } from "@/common/lib/utils";
import type { ProductValuationForecast } from "../../../types";
import { formatPrice, formatSignedPercent } from "../market-analysis/formatters";

type Forecast = ProductValuationForecast["valuationForecast"];

type ForecastPoint = {
    period: string;
    valueRate: number;
    expectedValue: number;
    expectedChangeRate: number;
    isCurrent: boolean;
    rateLabel: string;
};

const forecastPeriodLabels = {
    "1M": "1개월 후",
    "3M": "3개월 후",
    "6M": "6개월 후",
} as const;

const chartConfig = {
    valueRate: {
        label: "구매가 대비 가치",
        color: "#6653fb",
    },
} satisfies ChartConfig;

function toForecastPoints(forecast: Forecast): ForecastPoint[] {
    const currentPoint: ForecastPoint = {
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

    return [currentPoint, ...forecastPoints];
}

function ValuationForecastTooltip({
    active,
    payload,
}: {
    active?: boolean;
    payload?: ReadonlyArray<{ payload?: ForecastPoint }>;
}) {
    const point = payload?.[0]?.payload;

    if (!active || !point) {
        return null;
    }

    return (
        <div className="pointer-events-none rounded-[10px] bg-white px-3 py-2 shadow-[0_6px_16px_rgba(54,54,54,0.18)]">
            <p className="text-[10px] leading-[15px] text-[#83889e]">{point.period}</p>
            <p className="mt-0.5 text-[15px] leading-5 font-semibold text-[#575866]">
                {formatPrice(point.expectedValue)}
            </p>
            <p
                className={cn(
                    "mt-0.5 text-[10px] leading-[15px] font-semibold",
                    point.isCurrent || point.expectedChangeRate >= 0
                        ? "text-[#6653fb]"
                        : "text-[#ce3838]",
                )}
            >
                {point.isCurrent
                    ? "현재 등록 기준"
                    : `${formatSignedPercent(point.expectedChangeRate)} · 구매가 대비 ${point.rateLabel}`}
            </p>
        </div>
    );
}

export function ProductValuationForecastChart({ forecast }: { forecast: Forecast }) {
    const points = toForecastPoints(forecast);

    return (
        <div className="relative min-w-0" aria-label="현재부터 6개월 후까지 상품 가치 예측 차트">
            <div className="mb-2 flex items-center justify-between gap-3 px-1">
                <p className="text-[13px] leading-5 font-semibold text-[#464646]">
                    구매가 대비 가치
                </p>
                <div className="flex items-center gap-3 text-[9px] leading-[14px] text-[#83889e]">
                    <span className="flex items-center gap-1">
                        <span className="size-2 rounded-[2px] bg-[#6653fb]" aria-hidden="true" />
                        확인된 가치
                    </span>
                    <span className="flex items-center gap-1">
                        <span className="size-2 rounded-[2px] bg-[#e8e7f4]" aria-hidden="true" />
                        예상 가치
                    </span>
                </div>
            </div>
            <ChartContainer
                id="valuation-forecast"
                config={chartConfig}
                className="aspect-auto h-[255px] w-full p-0 [&_*:focus]:outline-none"
                initialDimension={{ width: 700, height: 255 }}
            >
                <BarChart data={points} margin={{ top: 25, right: 8, left: 8, bottom: 5 }}>
                    <CartesianGrid vertical={false} stroke="#ececf5" />
                    <XAxis
                        dataKey="period"
                        tickLine={false}
                        axisLine={false}
                        tick={{ fill: "#83889e", fontSize: 10 }}
                        tickMargin={8}
                    />
                    <YAxis domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} hide />
                    <ChartTooltip
                        cursor={{ fill: "rgba(102,83,251,0.04)" }}
                        content={<ValuationForecastTooltip />}
                        isAnimationActive={false}
                    />
                    <ReferenceLine x="현재" stroke="#b8b1ff" strokeDasharray="3 4" />
                    <Bar dataKey="valueRate" radius={[4, 4, 0, 0]} maxBarSize={52}>
                        <LabelList
                            dataKey="rateLabel"
                            position="top"
                            fill="#6653fb"
                            fontSize={10}
                            fontWeight={600}
                        />
                        {points.map((point) => (
                            <Cell
                                key={point.period}
                                fill={point.isCurrent ? "#6653fb" : "#e8e7f4"}
                            />
                        ))}
                    </Bar>
                </BarChart>
            </ChartContainer>
        </div>
    );
}
