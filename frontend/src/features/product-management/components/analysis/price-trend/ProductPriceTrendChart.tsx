"use client";

import {
    Area,
    AreaChart,
    CartesianGrid,
    Label,
    ReferenceDot,
    ReferenceLine,
    XAxis,
    YAxis,
} from "recharts";
import { TrendingUp } from "lucide-react";

import { ChartContainer, ChartTooltip, type ChartConfig } from "@/common/components/ui/Chart";
import { cn } from "@/common/lib/utils";
import type { ProductPriceTrend } from "../../../types";
import { formatPrice } from "../market-analysis/formatters";
import styles from "./ProductPriceTrendChart.module.css";

type ProductPriceTrendPoint = ProductPriceTrend["priceTrend"]["points"][number];

const chartConfig = {
    averagePrice: {
        label: "일 평균 거래가",
        color: "#6653fb",
    },
} satisfies ChartConfig;

function formatChartPrice(price: number) {
    return `${(price / 10000).toFixed(0)}만`;
}

function formatChartDate(date: string) {
    const [, month, day] = date.split("-");
    return `${Number(month)}/${Number(day)}`;
}

function formatComparedDate(date: string) {
    const [year, month, day] = date.split("-");
    return `${year}년 ${Number(month)}월 ${Number(day)}일`;
}

function getScale(points: ProductPriceTrendPoint[]) {
    const prices = points.map((point) => point.averagePrice);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const unit = 10000;
    const padding = Math.max(unit, Math.ceil(((maxPrice - minPrice) * 0.2) / unit) * unit);
    const lower = Math.floor((minPrice - padding) / unit) * unit;
    const upper = Math.ceil((maxPrice + padding) / unit) * unit;

    return {
        lower,
        upper,
        ticks: Array.from({ length: 5 }, (_, index) =>
            Math.round(upper - ((upper - lower) * index) / 4),
        ),
    };
}

function PriceTrendTooltip({
    active,
    payload,
}: {
    active?: boolean;
    payload?: ReadonlyArray<{ payload?: ProductPriceTrendPoint }>;
}) {
    const point = payload?.[0]?.payload;

    if (!active || !point) {
        return null;
    }

    const change = point.change;
    const changeAmount = change?.amount ?? 0;
    const changeRate = change?.rate ?? 0;
    const isPositive = changeRate >= 0;

    return (
        <div className="pointer-events-none rounded-[10px] bg-white px-4 py-3 shadow-[0_6px_16px_rgba(54,54,54,0.18)]">
            <p className="text-[10px] leading-[15px] text-[#83889e]">
                {formatComparedDate(point.date)}
            </p>
            <div className="mt-1 flex w-full items-center justify-between">
                <p className="text-[16px] leading-5 font-semibold text-[#575866]">
                    {formatPrice(point.averagePrice)}
                </p>
                {change ? (
                    <span
                        className={cn(
                            "shrink-0 text-[10px] leading-[15px] font-semibold",
                            isPositive ? "text-[#ce3838]" : "text-[#3478c6]",
                        )}
                    >
                        {isPositive ? "+" : ""}
                        {changeRate.toFixed(2)}%
                    </span>
                ) : null}
            </div>
            <p className="mt-1 text-[10px] leading-[15px] whitespace-nowrap text-[#6653fb]">
                {change
                    ? `거래 ${point.transactionCount}건 · 전일 대비 ${isPositive ? "+" : ""}${changeAmount.toLocaleString("ko-KR")}원`
                    : `거래 ${point.transactionCount}건 · 비교 데이터 없음`}
            </p>
        </div>
    );
}

function CurrentPriceLabel({ viewBox, value }: { viewBox?: unknown; value: number }) {
    const viewBoxRecord =
        typeof viewBox === "object" && viewBox !== null
            ? (viewBox as { x?: unknown; y?: unknown })
            : {};
    const x = Number(viewBoxRecord.x ?? 0);
    const y = Number(viewBoxRecord.y ?? 0);
    const badgeWidth = 116;
    const badgeX = x - 12;

    return (
        <g transform={`translate(${badgeX} ${y - 12})`} filter="url(#price-trend-current-shadow)">
            <rect width={badgeWidth} height="24" rx="12" fill="#6653fb" />
            <circle cx="12" cy="12" r="5" fill="white" />
            <text x="22" y="16" className="fill-white text-[10px] font-semibold">
                {`현재 ₩${value.toLocaleString("ko-KR")}`}
            </text>
        </g>
    );
}

export function ProductPriceTrendChart({
    points,
    totalTransactionCount,
}: {
    points: ProductPriceTrendPoint[];
    totalTransactionCount: number;
}) {
    const { lower, upper, ticks } = getScale(points);
    const lastIndex = points.length - 1;
    const latestPoint = points[lastIndex];
    const dateIndexes = [0, Math.floor(lastIndex / 3), Math.ceil((lastIndex * 2) / 3), lastIndex];
    const isLatestHighest =
        latestPoint.averagePrice === Math.max(...points.map((point) => point.averagePrice));

    return (
        <div
            className={cn(styles.chart, "relative min-w-0")}
            aria-label="최근 30일 일 평균 거래가 차트"
        >
            <div className="mb-2 flex items-center justify-between gap-3 px-1">
                <div className="flex items-center gap-2">
                    <span className="size-2 rounded-full bg-[#6653fb]" aria-hidden="true" />
                    <p className="text-[16px] leading-[25px] font-semibold tracking-[0.5px] text-[#2f3037]">
                        일 평균 거래가
                    </p>
                    <p className="text-[10px] leading-[15px] text-[#a1a3ae]">
                        실거래 {totalTransactionCount.toLocaleString("ko-KR")}건 기준
                    </p>
                </div>
                <p className="flex items-center gap-1 text-[12px] leading-[18px] font-semibold text-[#6653fb]">
                    <TrendingUp aria-hidden="true" className="size-[18px]" strokeWidth={2.5} />
                    {isLatestHighest ? "30일 최고가 갱신" : "최근 시세 반영"}
                </p>
            </div>
            <ChartContainer
                id="price-trend"
                config={chartConfig}
                className="aspect-auto h-[258px] w-full p-0 [&_*:focus]:outline-none [&_.recharts-surface]:outline-none [&_.recharts-wrapper]:outline-none [&_svg]:outline-none"
                initialDimension={{ width: 700, height: 258 }}
            >
                <AreaChart
                    accessibilityLayer
                    data={points}
                    margin={{ top: 14, right: 16, left: 0, bottom: 0 }}
                >
                    <defs>
                        <linearGradient id="price-trend-area" x1="0" x2="0" y1="0" y2="1">
                            <stop offset="0%" stopColor="#6653fb" stopOpacity="0.2" />
                            <stop offset="100%" stopColor="#6653fb" stopOpacity="0.02" />
                        </linearGradient>
                        <filter
                            id="price-trend-current-shadow"
                            x="-20%"
                            y="-60%"
                            width="140%"
                            height="220%"
                            colorInterpolationFilters="sRGB"
                        >
                            <feDropShadow
                                dx="0"
                                dy="0"
                                stdDeviation="6"
                                floodColor="#6653fb"
                                floodOpacity="0.7"
                            />
                        </filter>
                    </defs>
                    <CartesianGrid vertical={false} stroke="#e9e7ff" />
                    <XAxis
                        dataKey="date"
                        ticks={dateIndexes.map((index) => points[index].date)}
                        padding={{ left: 0, right: 120 }}
                        tickFormatter={formatChartDate}
                        tickLine={false}
                        axisLine={false}
                        tick={{ fill: "#a1a3ae", fontSize: 11 }}
                        tickMargin={8}
                    />
                    <YAxis
                        domain={[lower, upper]}
                        ticks={ticks}
                        tickFormatter={formatChartPrice}
                        tickLine={false}
                        axisLine={false}
                        tick={{ fill: "#a1a3ae", fontSize: 11 }}
                        tickMargin={8}
                        width={42}
                    />
                    <ChartTooltip
                        cursor={{ stroke: "#b8b1ff", strokeDasharray: "3 4" }}
                        content={<PriceTrendTooltip />}
                        isAnimationActive={false}
                    />
                    <Area
                        type="monotone"
                        dataKey="averagePrice"
                        stroke="#6653fb"
                        strokeWidth={2.5}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        fill="url(#price-trend-area)"
                        dot={false}
                        activeDot={{ r: 5, fill: "white", stroke: "#6653fb", strokeWidth: 3 }}
                        isAnimationActive={false}
                    />
                    <ReferenceLine x={latestPoint.date} stroke="#b8b1ff" strokeDasharray="3 4" />
                    <ReferenceDot
                        x={latestPoint.date}
                        y={latestPoint.averagePrice}
                        r={0}
                        fill="transparent"
                        stroke="transparent"
                    >
                        <Label
                            content={(props) => (
                                <CurrentPriceLabel
                                    viewBox={props.viewBox}
                                    value={latestPoint.averagePrice}
                                />
                            )}
                        />
                    </ReferenceDot>
                </AreaChart>
            </ChartContainer>
        </div>
    );
}
