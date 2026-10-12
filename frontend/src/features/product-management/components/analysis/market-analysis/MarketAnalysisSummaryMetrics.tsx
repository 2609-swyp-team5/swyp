import { Fragment } from "react";

import { Separator } from "@/common/components/ui/Separator";

import type { ProductMarketAnalysis } from "../../../types";
import { formatPrice, formatSignedPercent } from "./formatters";

type MarketAnalysisSummaryMetricsProps = {
    analysis: ProductMarketAnalysis;
    variant?: "default" | "management";
};

export function MarketAnalysisSummaryMetrics({
    analysis,
    variant = "default",
}: MarketAnalysisSummaryMetricsProps) {
    if (variant === "management") {
        const metrics = [
            {
                label: "AI 추천 판매가",
                value: formatPrice(analysis.suggestedPrice),
                valueClassName: "text-[#6653fb]",
                supportingText: `시세 대비 ${formatSignedPercent(analysis.marketPriceDiffRate)}`,
            },
            { label: "현재 판매가", value: formatPrice(analysis.currentPrice) },
            { label: "최근 평균 등록가", value: formatPrice(analysis.averagePrice) },
        ];

        return (
            <div className="flex min-h-[101px] w-full items-center rounded-[10px] border border-[#d3d3d3] bg-white px-[10px] py-5">
                {metrics.map((metric, index) => (
                    <Fragment key={metric.label}>
                        {index > 0 ? (
                            <Separator orientation="vertical" className="h-[52px]" />
                        ) : null}
                        <div className="flex min-w-0 flex-1 flex-col items-center justify-center text-center">
                            <span
                                className={`text-[12px] leading-5 tracking-[-0.5px] ${metric.valueClassName ?? "text-[#6b6c7b]"}`}
                            >
                                {metric.label}
                            </span>
                            <strong
                                className={`text-[22px] leading-[30px] font-semibold tracking-[0.5px] ${metric.valueClassName ?? "text-[#464646]"}`}
                            >
                                {metric.value}
                            </strong>
                            {metric.supportingText ? (
                                <span className="text-[10px] leading-[15px] tracking-[-0.5px] text-[#a9adbd]">
                                    {metric.supportingText}
                                </span>
                            ) : null}
                        </div>
                    </Fragment>
                ))}
            </div>
        );
    }

    const isBuyerView = analysis.recommendation === "BUY" || analysis.recommendation === "WAIT";
    const metrics =
        analysis.summary.type === "SALE_STATS"
            ? [
                  { label: "판매 기간", value: `${analysis.summary.salesDurationDays}일` },
                  { label: "조회수", value: `${analysis.summary.viewCount}` },
                  { label: "관심 수", value: `${analysis.summary.interestCount}` },
              ]
            : [
                  {
                      label: isBuyerView ? "구매 대기 기간" : "추천 대기 기간",
                      value: `${Math.ceil(analysis.summary.waitPeriodDays / 7)}주`,
                  },
                  {
                      label: "예상 가격 변화",
                      value: formatSignedPercent(analysis.summary.expectedPriceChangeRate),
                  },
                  { label: "신뢰도", value: `${analysis.summary.confidenceScore}%` },
              ];

    return (
        <div className="flex h-[95px] w-full items-center rounded-[10px] border border-[#d3d3d3] bg-white px-[10px] py-5">
            {metrics.map((metric, index) => (
                <Fragment key={metric.label}>
                    {index > 0 ? <Separator orientation="vertical" className="h-[55px]" /> : null}
                    <div className="flex h-[55px] flex-1 flex-col items-center justify-center text-center">
                        <span className="text-[16px] leading-[25px] text-[#9aa0b0]">
                            {metric.label}
                        </span>
                        <strong className="text-[20px] leading-[30px] font-semibold tracking-[0.5px] text-[#374151]">
                            {metric.value}
                        </strong>
                    </div>
                </Fragment>
            ))}
        </div>
    );
}
