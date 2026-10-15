"use client";

import { Bar, BarChart, CartesianGrid, Cell, LabelList, XAxis, YAxis } from "recharts";

import { ChartContainer, ChartTooltip, type ChartConfig } from "@/common/components/ui/Chart";
import type {
    ValuationForecastChartData,
    ValuationForecastChartPoint,
} from "../market-analysis/marketAnalysisAdapters";
import { formatPrice, formatSignedPercent } from "../market-analysis/formatters";

const chartConfig = {
    valueRate: {
        label: "감가 상각률",
        color: "#6653fb",
    },
} satisfies ChartConfig;

function ValuationForecastTooltip({
    active,
    payload,
}: {
    active?: boolean;
    payload?: ReadonlyArray<{ payload?: ValuationForecastChartPoint }>;
}) {
    const point = payload?.[0]?.payload;

    if (!active || !point) {
        return null;
    }

    return (
        <div className="pointer-events-none rounded-[10px] bg-white px-3 py-2 shadow-[0_6px_16px_rgba(54,54,54,0.18)]">
            <p className="typography-caption text-[#83889e]">{point.period}</p>
            <p className="typography-body-bold mt-0.5 font-semibold text-[#575866]">
                {formatPrice(point.expectedValue)}
            </p>
            <p
                className={`typography-caption mt-0.5 font-semibold ${point.expectedChangeRate > 0 ? "text-[#fa503d]" : "text-[#6653fb]"}`}
            >
                {point.isCurrent
                    ? "현재 등록 기준"
                    : `${formatSignedPercent(point.expectedChangeRate)} · 구매가 대비 ${point.rateLabel}`}
            </p>
        </div>
    );
}

export function ProductValuationForecastChart({ data }: { data: ValuationForecastChartData }) {
    const { points } = data;

    return (
        <div className="relative min-w-0" aria-label="현재부터 6개월 후까지 상품 가치 예측 차트">
            <div className="mb-3 flex items-start justify-between gap-3 px-[30px]">
                <div className="flex flex-col gap-[5px]">
                    <p className="typography-heading-03 font-semibold text-[#363636]">
                        감가 상각률
                    </p>
                    <p className="typography-body-small text-[#a1a3ae]">
                        구매가 대비 가치를 확인해보세요
                    </p>
                </div>
                <div className="typography-body-small flex items-center gap-3 text-[#6b6c7b]">
                    <span className="flex items-center gap-[6px]">
                        <span
                            className="size-[10px] rounded-[3px] bg-[#6653fb]"
                            aria-hidden="true"
                        />
                        확인된 가치
                    </span>
                    <span className="flex items-center gap-[6px]">
                        <span
                            className="size-[10px] rounded-[3px] bg-[#d1d5db]"
                            aria-hidden="true"
                        />
                        예상 가치
                    </span>
                </div>
            </div>
            <div className="px-[20px]">
                <ChartContainer
                    id="valuation-forecast"
                    config={chartConfig}
                    className="aspect-auto h-[281px] w-full p-0 [&_*:focus]:outline-none"
                    initialDimension={{ width: 700, height: 281 }}
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
                            cursor={false}
                            content={<ValuationForecastTooltip />}
                            isAnimationActive={false}
                        />
                        <defs>
                            <linearGradient
                                id="valuation-current-gradient"
                                x1="0"
                                y1="0"
                                x2="0"
                                y2="1"
                            >
                                <stop offset="0%" stopColor="#6653fb" />
                                <stop offset="100%" stopColor="#998eee" />
                            </linearGradient>
                        </defs>
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
                                    fill={
                                        point.isCurrent
                                            ? "url(#valuation-current-gradient)"
                                            : "#dedce9"
                                    }
                                />
                            ))}
                        </Bar>
                    </BarChart>
                </ChartContainer>
            </div>
        </div>
    );
}
