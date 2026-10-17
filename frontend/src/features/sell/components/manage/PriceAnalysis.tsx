"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { ArrowRight, Sparkles } from "lucide-react";

import { Button } from "@/common/components/ui/Button";
import type { ProductMarketAnalysis } from "@/features/product-management/types";
import type { ProductResponse } from "@/features/sell/types";
import { priceFormatter } from "@/features/sell/components/manage/productReviewUtils";

const EMPTY_VALUE = "-";

const recommendationBadgeClassNames: Record<string, string> = {
    SELL: "bg-[#6653fb]",
    HOLD: "bg-[#272727]",
    BUY: "bg-[#6653fb]",
    WAIT: "bg-[#272727]",
};

const formatSignedPercent = (value: number | null | undefined) => {
    if (value === null || value === undefined) {
        return EMPTY_VALUE;
    }

    return `${value > 0 ? "+" : ""}${value.toFixed(1)}%`;
};

const formatAnalyzedAt = (value: string | undefined) => {
    if (!value) {
        return EMPTY_VALUE;
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return EMPTY_VALUE;
    }

    const pad = (number: number) => String(number).padStart(2, "0");

    return `${date.getFullYear()}.${pad(date.getMonth() + 1)}.${pad(date.getDate())} ${pad(
        date.getHours(),
    )}:${pad(date.getMinutes())}`;
};

const recommendationLabels: Record<string, string> = {
    SELL: "판매 추천",
    HOLD: "판매 대기",
    BUY: "구매 추천",
    WAIT: "구매 대기",
};

// 판매자 기준: 내 가격이 시세보다 비싸면(+) 늦게 팔릴 수 있어 주의(빨강), 싸면(-) 브랜드색
const getPriceDiffClassName = (value: number | null | undefined) => {
    if (value === null || value === undefined || value === 0) {
        return "text-[#374151]";
    }

    return value > 0 ? "text-[#ef4444]" : "text-[#6653fb]";
};

function AnalysisMetric({
    label,
    value,
    isFirst,
    valueClassName,
}: {
    label: string;
    value: string;
    isFirst: boolean;
    valueClassName?: string;
}) {
    return (
        <div
            className={`flex min-w-0 flex-col items-center justify-center gap-0.5 text-center ${
                isFirst ? "" : "lg:border-l lg:border-[#d3d3d3]"
            }`}
        >
            <span className="typography-body-small text-[#9aa0b0]">{label}</span>
            <strong
                className={`typography-heading-03 font-semibold ${valueClassName ?? "text-[#374151]"}`}
            >
                {value}
            </strong>
        </div>
    );
}

export function PriceAnalysis({
    product,
    marketAnalysis,
    competitionCount,
}: {
    product: ProductResponse;
    marketAnalysis?: ProductMarketAnalysis | null;
    competitionCount?: number | null;
}) {
    const router = useRouter();
    const suggestedPrice = marketAnalysis?.suggestedPrice ?? product.suggestedPrice;
    const recommendation = marketAnalysis ? marketAnalysis.recommendation : product.recommendation;
    const recommendationBadgeClassName = recommendation
        ? (recommendationBadgeClassNames[recommendation] ?? "bg-[#83889e]")
        : "bg-[#83889e]";
    const analysisDescription =
        (marketAnalysis ? marketAnalysis.description : product.analysisDescription) ||
        "분석 결과가 없습니다.";
    const confidenceScore =
        marketAnalysis?.summary.type === "WAIT_RECOMMENDATION"
            ? `${marketAnalysis.summary.confidenceScore}%`
            : marketAnalysis?.confidenceRate !== null &&
                marketAnalysis?.confidenceRate !== undefined
              ? `${marketAnalysis.confidenceRate}%`
              : EMPTY_VALUE;
    const metrics = [
        {
            label: "내 가격 시세 대비",
            value: marketAnalysis
                ? formatSignedPercent(marketAnalysis.marketPriceDiffRate)
                : EMPTY_VALUE,
            valueClassName: getPriceDiffClassName(marketAnalysis?.marketPriceDiffRate),
        },
        {
            label: "비교 매물 수",
            value:
                competitionCount === null || competitionCount === undefined
                    ? EMPTY_VALUE
                    : `${competitionCount}개`,
        },
        { label: "신뢰도", value: confidenceScore },
        {
            label: "분석 시각",
            value: formatAnalyzedAt(marketAnalysis?.analyzedAt),
        },
    ];

    return (
        <section
            aria-labelledby="price-analysis-title"
            className="rounded-none bg-[#fafbff] p-5 md:p-7 lg:p-[30px]"
        >
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-b from-[#6653fb] to-[#b1a9ef] text-white">
                        <Sparkles aria-hidden="true" className="size-6" />
                    </span>
                    <h2
                        id="price-analysis-title"
                        className="typography-heading-02 font-bold text-[#6653fb]"
                    >
                        AI 가격 분석
                    </h2>
                </div>
                <Button
                    type="button"
                    variant="outline"
                    onClick={() => router.push(`/sell/manage?selected=${product.id}`)}
                    className="typography-body-bold h-auto rounded-full border-[#6653fb] bg-white px-5 py-1 font-semibold text-[#6653fb] hover:bg-[#f5f3ff] hover:text-[#5745e7]"
                >
                    가격 분석 자세히 보기
                    <ArrowRight aria-hidden="true" className="size-4" />
                </Button>
            </div>

            <div className="mt-7 rounded-[10px] border border-[#d3d3d3] bg-white px-5 py-6 md:px-7">
                <div className="grid gap-5 lg:grid-cols-[142px_minmax(0,1fr)_auto] lg:items-center lg:gap-7">
                    <Image
                        src="/sell/price-analysis-chart.svg"
                        alt=""
                        width={142}
                        height={126}
                        className="h-[126px] w-[142px] shrink-0"
                    />
                    <div className="min-w-0">
                        <p className="typography-heading-02 font-bold text-[#6653fb]">
                            {suggestedPrice === null || suggestedPrice === undefined
                                ? "분석 결과 준비 중"
                                : `${priceFormatter.format(suggestedPrice)}원`}
                        </p>
                        <p className="typography-body-medium mt-1 font-normal text-[#83889e]">
                            {marketAnalysis
                                ? "최근 시세와 거래 데이터를 바탕으로 분석했어요."
                                : "AI가 분석한 적정 판매 가격이에요."}
                        </p>
                    </div>
                    {recommendation ? (
                        <div className="flex min-w-0 flex-col gap-2.5 lg:items-end lg:text-right">
                            <span
                                className={`typography-body-bold w-fit rounded-full px-5 py-2.5 font-semibold text-white ${recommendationBadgeClassName}`}
                            >
                                {recommendationLabels[recommendation] ?? recommendation}
                            </span>
                        </div>
                    ) : null}
                </div>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-y-5 rounded-[10px] border border-[#d3d3d3] bg-white px-5 py-5 lg:grid-cols-4 lg:gap-y-0">
                {metrics.map((metric, index) => (
                    <AnalysisMetric key={metric.label} {...metric} isFirst={index === 0} />
                ))}
            </div>

            <div className="mt-5 rounded-[10px] border border-[#d3d3d3] bg-white p-5 md:p-7">
                <div className="flex items-center gap-2.5">
                    <h3 className="typography-body-large font-semibold text-[#6653fb]">
                        추천 이유
                    </h3>
                </div>
                <p className="typography-body-medium mt-3 font-normal break-keep text-[#363636]">
                    {analysisDescription}
                </p>
            </div>
        </section>
    );
}
