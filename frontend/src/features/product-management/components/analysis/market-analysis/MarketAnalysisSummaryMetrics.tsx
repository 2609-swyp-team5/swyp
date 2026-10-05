import type { ProductMarketAnalysis } from "../../../types";
import { formatSignedPercent } from "./formatters";

export function MarketAnalysisSummaryMetrics({
    summary,
    isBuyerView = false,
}: {
    summary: ProductMarketAnalysis["summary"];
    isBuyerView?: boolean;
}) {
    const metrics =
        summary.type === "SALE_STATS"
            ? [
                  { label: "판매 기간", value: `${summary.salesDurationDays}일` },
                  { label: "조회수", value: `${summary.viewCount}` },
                  { label: "관심 수", value: `${summary.interestCount}` },
              ]
            : [
                  {
                      label: isBuyerView ? "구매 대기 기간" : "추천 대기 기간",
                      value: `${Math.ceil(summary.waitPeriodDays / 7)}주`,
                  },
                  {
                      label: "예상 가격 변화",
                      value: formatSignedPercent(summary.expectedPriceChangeRate),
                  },
                  { label: "신뢰도", value: `${summary.confidenceScore}%` },
              ];

    return (
        <div className="flex h-[95px] items-center divide-x divide-[#d3d3d3] rounded-[10px] border border-[#d3d3d3] bg-white px-[10px] py-5">
            {metrics.map((metric) => (
                <div
                    key={metric.label}
                    className="flex h-[55px] flex-1 flex-col items-center justify-center text-center"
                >
                    <span className="text-[16px] leading-[25px] text-[#9aa0b0]">
                        {metric.label}
                    </span>
                    <strong className="text-[20px] leading-[30px] font-semibold tracking-[0.5px] text-[#374151]">
                        {metric.value}
                    </strong>
                </div>
            ))}
        </div>
    );
}
