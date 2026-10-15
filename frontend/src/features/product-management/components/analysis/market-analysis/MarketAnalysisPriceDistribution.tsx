"use client";

import { useState } from "react";

import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/common/components/ui/Card";
import { cn } from "@/common/lib/utils";

import type { ProductPriceDistribution } from "../../../types";
import type { StreamingQueryState } from "../../shared/streaming/productManagementStreamingTypes";
import {
    toPriceDistributionViewModel,
    type PriceDistributionViewModel,
} from "./marketAnalysisAdapters";
import { formatManWon } from "./formatters";

function clamp(value: number, min: number, max: number) {
    return Math.min(Math.max(value, min), max);
}

function PriceMetric({
    label,
    value,
    className,
}: {
    label: string;
    value: string;
    className?: string;
}) {
    return (
        <div
            className={cn(
                "flex min-w-0 flex-1 flex-col items-center gap-1 px-1 py-[10px] md:p-[10px]",
                className,
            )}
        >
            <span className="typography-body-small text-[#777987]">{label}</span>
            <strong className="typography-body-bold font-bold whitespace-nowrap text-[#2f3037]">
                {value}
            </strong>
        </div>
    );
}

function ExpectedPriceLabel({ price }: { price: string }) {
    return (
        <div className="flex h-[50px] w-[99px] flex-col items-center justify-center gap-[5px] rounded-[5px] border-[0.5px] border-[#e1e1e1] bg-white">
            <span className="typography-body-small font-bold text-[#9a84f3]">추천가격</span>
            <strong className="typography-body-bold font-semibold whitespace-nowrap text-black">
                {price}
            </strong>
        </div>
    );
}

function PriceMarker() {
    return (
        <div className="flex size-[29px] items-center justify-center rounded-full bg-[#6b49fd]/30">
            <span
                className="size-[17px] rounded-full border-[0.5px] border-white bg-[#6b49fd]"
                aria-hidden="true"
            />
        </div>
    );
}

// 막대 양 끝에서 점이 잘리지 않도록 눈금·점·채움을 모두 같은 안쪽 영역 기준으로 배치한다.
const TRACK_INSET_PX = 15;
// 기준 점 라벨이 이 간격(%)보다 가까우면 겹치므로 뒤의 라벨은 생략한다.
const MIN_LABEL_GAP_PERCENT = 14;

function trackLeft(position: number) {
    return `calc(${TRACK_INSET_PX}px + (100% - ${TRACK_INSET_PX * 2}px) * ${position / 100})`;
}

type ReferencePoint = {
    key: "min" | "average" | "max";
    label: string;
    position: number;
    showLabel: boolean;
};

function toReferencePoints(
    data: PriceDistributionViewModel,
    toPosition: (price: number) => number,
): ReferencePoint[] {
    const points = [
        { key: "min" as const, label: "최저", position: toPosition(data.minPrice) },
        { key: "average" as const, label: "평균", position: toPosition(data.averagePrice) },
        { key: "max" as const, label: "최고", position: toPosition(data.maxPrice) },
    ];
    const labeledPositions: number[] = [];

    return points.map((point) => {
        const showLabel = labeledPositions.every(
            (position) => Math.abs(position - point.position) >= MIN_LABEL_GAP_PERCENT,
        );
        if (showLabel) {
            labeledPositions.push(point.position);
        }
        return { ...point, showLabel };
    });
}

type DistributionTab = "onSale" | "soldOut";

function DistributionTabs({
    selectedTab,
    onTabChange,
}: {
    selectedTab: DistributionTab;
    onTabChange: (tab: DistributionTab) => void;
}) {
    return (
        <div
            className="mt-4 flex w-fit rounded-[5px] bg-[#f0efff] p-1"
            role="tablist"
            aria-label="거래 가격 분포 기준"
        >
            {(
                [
                    ["onSale", "판매 중"],
                    ["soldOut", "판매 완료"],
                ] as const
            ).map(([tab, label]) => (
                <button
                    key={tab}
                    type="button"
                    role="tab"
                    aria-selected={selectedTab === tab}
                    className={cn(
                        "typography-body-small rounded-[3px] px-3 py-1.5 transition-colors",
                        selectedTab === tab
                            ? "bg-white font-semibold text-[#6653fb] shadow-sm"
                            : "text-[#83889e]",
                    )}
                    onClick={() => onTabChange(tab)}
                >
                    {label}
                </button>
            ))}
        </div>
    );
}

function DistributionCardHeader({
    selectedTab,
    onTabChange,
}: {
    selectedTab: DistributionTab;
    onTabChange: (tab: DistributionTab) => void;
}) {
    return (
        <CardHeader className="gap-[5px] rounded-none p-5">
            <CardTitle className="typography-heading-03 font-semibold text-[#363636]">
                거래 가격 분포
            </CardTitle>
            <CardDescription className="typography-body-small text-[#a1a3ae]">
                비슷한 상품의 가격과 비교해 보세요.
            </CardDescription>
            <DistributionTabs selectedTab={selectedTab} onTabChange={onTabChange} />
        </CardHeader>
    );
}

function DistributionStateCard({
    message,
    role,
    selectedTab,
    onTabChange,
}: {
    message: string;
    role?: "alert" | "status";
    selectedTab: DistributionTab;
    onTabChange: (tab: DistributionTab) => void;
}) {
    return (
        <Card className="min-w-0 gap-0 rounded-[10px] border border-[#6653fb] bg-white p-0 text-[#2f3037] ring-0">
            <DistributionCardHeader selectedTab={selectedTab} onTabChange={onTabChange} />
            <CardContent
                role={role}
                className="typography-body-small flex min-h-[150px] flex-col items-center justify-center gap-3 rounded-none bg-[#fafbff] px-5 py-8 text-center text-[#83889e]"
            >
                <p>{message}</p>
            </CardContent>
        </Card>
    );
}

export function MarketAnalysisPriceDistribution({
    variant = "default",
    query,
}: {
    variant?: "default" | "management" | "sold";
    query?: StreamingQueryState<ProductPriceDistribution>;
}) {
    const [selectedTab, setSelectedTab] = useState<DistributionTab>(
        variant === "sold" ? "soldOut" : "onSale",
    );
    const selectedDistribution = query?.data?.[selectedTab];
    const data: PriceDistributionViewModel | null = selectedDistribution
        ? toPriceDistributionViewModel(selectedDistribution)
        : null;
    const emptyMessage =
        selectedTab === "soldOut"
            ? "최근 판매 완료된 유사 상품이 없어요."
            : "현재 판매 중인 유사 상품이 없어요.";
    const onTabChange = (tab: DistributionTab) => setSelectedTab(tab);

    if (query?.isPending) {
        return (
            <DistributionStateCard
                message="거래 가격 분포를 불러오는 중이에요."
                role="status"
                selectedTab={selectedTab}
                onTabChange={onTabChange}
            />
        );
    }

    if (query?.error) {
        return (
            <DistributionStateCard
                message="거래 가격 분포를 불러오지 못했어요."
                role="alert"
                selectedTab={selectedTab}
                onTabChange={onTabChange}
            />
        );
    }

    if (!data) {
        return (
            <DistributionStateCard
                message={emptyMessage}
                selectedTab={selectedTab}
                onTabChange={onTabChange}
            />
        );
    }

    // 추천가가 최저가보다 낮거나 최고가보다 높을 수 있어 눈금 범위에 함께 포함한다.
    const scaleMin = Math.min(data.minPrice, data.averagePrice, data.suggestedPrice);
    const scaleMax = Math.max(data.maxPrice, data.averagePrice, data.suggestedPrice);
    const toPosition = (price: number) =>
        scaleMax === scaleMin
            ? 50
            : clamp(((price - scaleMin) / (scaleMax - scaleMin)) * 100, 0, 100);
    const expectedPosition = toPosition(data.suggestedPrice);
    const referencePoints = toReferencePoints(data, toPosition);
    const labelPosition = `clamp(49px, ${trackLeft(expectedPosition)}, calc(100% - 49px))`;

    return (
        <Card className="min-w-0 gap-0 rounded-[10px] border border-[#6653fb] bg-white p-0 text-[#2f3037] ring-0">
            <DistributionCardHeader selectedTab={selectedTab} onTabChange={onTabChange} />
            <CardContent className="flex flex-col gap-[13px] rounded-none bg-[#fafbff] px-5 pt-5 pb-5">
                <div className="relative h-[52px] w-full">
                    <div
                        className="absolute top-0 -translate-x-1/2"
                        style={{ left: labelPosition }}
                    >
                        <ExpectedPriceLabel price={formatManWon(data.suggestedPrice)} />
                    </div>
                </div>
                <div className="flex flex-col gap-2">
                    <div className="relative h-[15px] w-full">
                        <div className="absolute inset-0 overflow-hidden rounded-[999px] bg-white shadow-[inset_0_1px_2px_0_rgba(0,0,0,0.1)]">
                            <div
                                className="absolute inset-y-0 left-0 rounded-[999px] bg-gradient-to-r from-[#d1d6fe] to-[#c4b0f7]"
                                style={{ width: trackLeft(expectedPosition) }}
                                aria-hidden="true"
                            />
                        </div>
                        {/* 눈금선은 최저·평균·최고 점 위치에 그려 점·라벨과 한 줄로 맞춘다 */}
                        {referencePoints.map((point) => (
                            <span
                                key={point.key}
                                data-testid={`price-distribution-tick-${point.key}`}
                                className="absolute inset-y-0 w-px -translate-x-1/2 bg-[#e1e1e1]"
                                style={{ left: trackLeft(point.position) }}
                                aria-hidden="true"
                            />
                        ))}
                        {referencePoints.map((point) => (
                            <span
                                key={point.key}
                                data-testid={`price-distribution-point-${point.key}`}
                                className="absolute top-1/2 size-[9px] -translate-x-1/2 -translate-y-1/2 rounded-full border-[1.5px] border-white bg-[#a1a3ae] shadow-[0_0_0_0.5px_rgba(0,0,0,0.1)]"
                                style={{ left: trackLeft(point.position) }}
                                aria-hidden="true"
                            />
                        ))}
                        <span
                            data-testid="price-distribution-point-suggested"
                            className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2"
                            style={{ left: trackLeft(expectedPosition) }}
                            aria-hidden="true"
                        >
                            <PriceMarker />
                        </span>
                    </div>
                    <div className="relative h-[13px] w-full" aria-hidden="true">
                        {referencePoints
                            .filter((point) => point.showLabel)
                            .map((point) => (
                                <span
                                    key={point.key}
                                    className="typography-body-small absolute top-0 -translate-x-1/2 whitespace-nowrap text-[#777987]"
                                    style={{ left: trackLeft(point.position) }}
                                >
                                    {point.label}
                                </span>
                            ))}
                    </div>
                </div>
            </CardContent>
            <div className="flex items-center justify-between gap-[5px] bg-[#6b49fd] px-5 py-2.5 text-white">
                <span className="typography-body-large font-semibold">추천 가격</span>
                <strong className="typography-heading-03 font-bold">
                    {formatManWon(data.suggestedPrice)}
                </strong>
            </div>
            <CardFooter className="rounded-none border-0 bg-white px-2.5 py-5 text-center">
                <div className="flex w-full items-center justify-between overflow-hidden rounded-[5px] bg-white">
                    <PriceMetric
                        label="최저가"
                        value={formatManWon(data.minPrice)}
                        className="border-r border-[#d3d3d3]"
                    />
                    <PriceMetric
                        label="평균 거래가"
                        value={formatManWon(data.averagePrice)}
                        className="border-r border-[#d3d3d3]"
                    />
                    <PriceMetric label="최고가" value={formatManWon(data.maxPrice)} />
                </div>
            </CardFooter>
        </Card>
    );
}
