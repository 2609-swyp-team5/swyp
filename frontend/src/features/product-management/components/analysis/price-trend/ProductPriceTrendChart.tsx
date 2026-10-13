"use client";

import { useEffect, useRef, useState } from "react";

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
import type {
    PriceTrendChartData,
    PriceTrendChartPoint,
} from "../market-analysis/marketAnalysisAdapters";
import { formatPrice } from "../market-analysis/formatters";
import styles from "./ProductPriceTrendChart.module.css";

const chartConfig = {
    averagePrice: {
        label: "일 평균 거래가",
        color: "#6653fb",
    },
} satisfies ChartConfig;

const PRICE_TREND_CHART_HEIGHT = 258;
const PRICE_TREND_X_AXIS_RESERVED_HEIGHT = 28;
const CURRENT_PRICE_BADGE_HEIGHT = 25;
const CURRENT_PRICE_BADGE_HORIZONTAL_PADDING = 20;
const DEFAULT_CURRENT_PRICE_BADGE_WIDTH = 116;

function formatChartPrice(price: number) {
    return `${(price / 10000).toFixed(0)}만`;
}

function getScale(points: PriceTrendChartPoint[]) {
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
    payload?: ReadonlyArray<{ payload?: PriceTrendChartPoint }>;
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
            <p className="text-[10px] leading-[15px] text-[#83889e]">{point.tooltipDateLabel}</p>
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

function CurrentPriceLabel({
    viewBox,
    value,
    chartHeight,
    textWidth,
    onTextWidthChange,
}: {
    viewBox?: unknown;
    value: number;
    chartHeight: number;
    textWidth: number | null;
    onTextWidthChange: (width: number) => void;
}) {
    const viewBoxRecord =
        typeof viewBox === "object" && viewBox !== null
            ? (viewBox as { x?: unknown; y?: unknown; width?: unknown; height?: unknown })
            : {};
    const x = Number(viewBoxRecord.x ?? 0) + Number(viewBoxRecord.width ?? 0) / 2;
    const y = Number(viewBoxRecord.y ?? 0) + Number(viewBoxRecord.height ?? 0) / 2;
    const label = `현재 ₩${value.toLocaleString("ko-KR")}`;
    const textRef = useRef<SVGTextElement>(null);
    const badgeWidth =
        textWidth === null
            ? DEFAULT_CURRENT_PRICE_BADGE_WIDTH
            : Math.ceil(textWidth + CURRENT_PRICE_BADGE_HORIZONTAL_PADDING);
    const badgeHeight = CURRENT_PRICE_BADGE_HEIGHT;
    const badgeX = x - badgeWidth / 2;
    const markerRadius = 14.5;
    const labelGap = 15;
    const chartBottom = chartHeight - PRICE_TREND_X_AXIS_RESERVED_HEIGHT;
    const canPlaceBelow = y + markerRadius + labelGap + badgeHeight <= chartBottom;
    const badgeY = canPlaceBelow
        ? y + markerRadius + labelGap
        : y - markerRadius - labelGap - badgeHeight;

    useEffect(() => {
        const measuredTextWidth = textRef.current?.getComputedTextLength();

        if (measuredTextWidth && Number.isFinite(measuredTextWidth)) {
            onTextWidthChange(measuredTextWidth);
        }
    }, [label, onTextWidthChange]);

    return (
        <g transform={`translate(${badgeX} ${badgeY})`} filter="url(#price-trend-current-shadow)">
            <rect width={badgeWidth} height={badgeHeight} rx="10" fill="#6653fb" stroke="#6653fb" />
            <text
                ref={textRef}
                x={badgeWidth - 10}
                y="16"
                textAnchor="end"
                className="fill-white text-[10px] font-bold"
            >
                {label}
            </text>
        </g>
    );
}

export function ProductPriceTrendChart({ data }: { data: PriceTrendChartData }) {
    const { points, totalTransactionCount, isLatestHighest } = data;
    const { lower, upper, ticks } = getScale(points);
    const lastIndex = points.length - 1;
    const latestPoint = points[lastIndex];
    const dateIndexes = [
        ...new Set(
            Array.from({ length: Math.min(6, points.length) }, (_, index) =>
                Math.round((lastIndex * index) / Math.max(Math.min(6, points.length) - 1, 1)),
            ),
        ),
    ];
    const [currentPriceTextWidth, setCurrentPriceTextWidth] = useState<number | null>(null);
    const currentPriceBadgeWidth =
        currentPriceTextWidth === null
            ? DEFAULT_CURRENT_PRICE_BADGE_WIDTH
            : Math.ceil(currentPriceTextWidth + CURRENT_PRICE_BADGE_HORIZONTAL_PADDING);
    const chartRightPadding = Math.max(50, Math.ceil(currentPriceBadgeWidth / 2 + 12));

    return (
        <div
            className={cn(styles.chart, "relative min-w-0")}
            aria-label="최근 30일 일 평균 거래가 차트"
        >
            <div className="mb-3 flex items-center justify-between gap-3 px-1">
                <div className="flex flex-col items-start justify-center gap-[5px]">
                    <div className="flex items-center gap-2">
                        <p className="text-[20px] leading-[25px] font-semibold tracking-[0.5px] text-[#363636]">
                            일 평균 거래가
                        </p>
                    </div>
                    <p className="text-[12px] leading-[15px] text-[#a1a3ae]">
                        실거래 {totalTransactionCount.toLocaleString("ko-KR")}건 기준
                    </p>
                </div>
                <p className="flex items-center gap-[7px] text-[13px] leading-5 font-semibold tracking-[-0.5px] text-[#5140dd]">
                    <TrendingUp aria-hidden="true" className="size-5" strokeWidth={2.5} />
                    {isLatestHighest ? "최근 1개월 최고가 갱신" : "최근 시세 반영"}
                </p>
            </div>
            <ChartContainer
                id="price-trend"
                config={chartConfig}
                className="aspect-auto h-[258px] w-full p-0 [&_*:focus]:outline-none [&_.recharts-surface]:outline-none [&_.recharts-wrapper]:outline-none [&_svg]:outline-none"
                initialDimension={{ width: 700, height: PRICE_TREND_CHART_HEIGHT }}
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
                                stdDeviation="5.85"
                                floodColor="#6653fb"
                                floodOpacity="0.8"
                            />
                        </filter>
                    </defs>
                    <CartesianGrid vertical={false} stroke="#e9e7ff" />
                    <XAxis
                        dataKey="date"
                        ticks={dateIndexes.map((index) => points[index].date)}
                        padding={{
                            left: 10,
                            right: chartRightPadding,
                        }}
                        tickFormatter={(value) =>
                            points.find((point) => point.date === String(value))?.dateLabel ??
                            String(value)
                        }
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
                        tickMargin={4}
                        width="auto"
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
                        r={14.5}
                        fill="#6b49fd"
                        fillOpacity={0.3}
                        stroke="transparent"
                    />
                    <ReferenceDot
                        x={latestPoint.date}
                        y={latestPoint.averagePrice}
                        r={8.5}
                        fill="#6b49fd"
                        stroke="white"
                        strokeWidth={0.5}
                    >
                        <Label
                            content={(props) => (
                                <CurrentPriceLabel
                                    viewBox={props.viewBox}
                                    value={latestPoint.averagePrice}
                                    chartHeight={PRICE_TREND_CHART_HEIGHT}
                                    textWidth={currentPriceTextWidth}
                                    onTextWidthChange={setCurrentPriceTextWidth}
                                />
                            )}
                        />
                    </ReferenceDot>
                </AreaChart>
            </ChartContainer>
        </div>
    );
}
