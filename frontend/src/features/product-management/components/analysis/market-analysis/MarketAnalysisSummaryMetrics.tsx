import { Fragment } from "react";

import { Separator } from "@/common/components/ui/Separator";

import type { ProductMarketAnalysis } from "../../../types";
import { describeDiffFromMarket, formatPrice, formatSignedPercent } from "./formatters";

type MarketAnalysisSummaryMetricsProps = {
    analysis: ProductMarketAnalysis;
    variant?: "default" | "management";
};

type ManagementMetric = {
    label: string;
    value: string;
    valueClassName?: string;
    supportingText?: string;
};

export function MarketAnalysisSummaryMetrics({
    analysis,
    variant = "default",
}: MarketAnalysisSummaryMetricsProps) {
    const isBuyerView = analysis.recommendation === "BUY" || analysis.recommendation === "WAIT";
    const isWaitingRecommendation =
        analysis.recommendation === "HOLD" || analysis.recommendation === "WAIT";

    if (variant === "management") {
        const metrics: ManagementMetric[] =
            isWaitingRecommendation && analysis.summary.type === "WAIT_RECOMMENDATION"
                ? [
                      {
                          label: isBuyerView ? "구매 대기 기간" : "추천 대기 기간",
                          value: `${Math.ceil(analysis.summary.waitPeriodDays / 7)}주`,
                          valueClassName: "text-[#6653fb]",
                      },
                      {
                          label: "예상 가격 변화",
                          value: formatSignedPercent(analysis.summary.expectedPriceChangeRate),
                      },
                      { label: "신뢰도", value: `${analysis.summary.confidenceScore}%` },
                  ]
                : [
                      {
                          label: isBuyerView ? "AI 추천 구매가" : "AI 추천 판매가",
                          value: formatPrice(analysis.suggestedPrice),
                          valueClassName: "text-[#6653fb]",
                      },
                      {
                          label: "현재 판매가",
                          value: formatPrice(analysis.currentPrice),
                          // 시세 대비 차이는 추천가가 아니라 현재 판매가 기준이라 이 칸에 둔다
                          supportingText:
                              describeDiffFromMarket(analysis.marketPriceDiffRate) ?? undefined,
                      },
                      { label: "최근 평균 등록가", value: formatPrice(analysis.averagePrice) },
                  ];

        return (
            // 휴대폰은 세 값이 한 줄에 들어가지 않아 "이름 — 값" 세로 목록으로 보여준다.
            <div className="flex w-full flex-col divide-y divide-[#f1f1f1] rounded-[10px] border border-[#d3d3d3] bg-white px-4 py-1 md:min-h-[101px] md:flex-row md:items-center md:divide-y-0 md:px-[10px] md:py-5">
                {metrics.map((metric, index) => (
                    <Fragment key={metric.label}>
                        {index > 0 ? (
                            <Separator
                                orientation="vertical"
                                className="hidden h-[52px] md:block"
                            />
                        ) : null}
                        <div className="flex min-w-0 flex-1 flex-wrap items-center justify-between gap-x-3 py-3 md:flex-col md:flex-nowrap md:justify-center md:py-0 md:text-center">
                            <span
                                className={`typography-body-small break-keep ${metric.valueClassName ?? "text-[#6b6c7b]"}`}
                            >
                                {metric.label}
                            </span>
                            <strong
                                className={`typography-heading-bold font-semibold whitespace-nowrap ${metric.valueClassName ?? "text-[#464646]"}`}
                            >
                                {metric.value}
                            </strong>
                            {metric.supportingText ? (
                                <span className="typography-caption w-full text-right text-[#a9adbd] md:w-auto md:text-center">
                                    {metric.supportingText}
                                </span>
                            ) : null}
                        </div>
                    </Fragment>
                ))}
            </div>
        );
    }

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
        <div className="flex min-h-[80px] w-full items-center rounded-[10px] border border-[#d3d3d3] bg-white px-[6px] py-4 md:h-[95px] md:px-[10px] md:py-5">
            {metrics.map((metric, index) => (
                <Fragment key={metric.label}>
                    {index > 0 ? <Separator orientation="vertical" className="h-[55px]" /> : null}
                    <div className="flex h-[55px] flex-1 flex-col items-center justify-center text-center">
                        <span className="typography-body-medium break-keep text-[#9aa0b0]">
                            {metric.label}
                        </span>
                        <strong className="typography-heading-03 font-semibold text-[#374151]">
                            {metric.value}
                        </strong>
                    </div>
                </Fragment>
            ))}
        </div>
    );
}
