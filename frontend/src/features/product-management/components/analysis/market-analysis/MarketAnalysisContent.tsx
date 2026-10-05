import { cn } from "@/common/lib/utils";

import type {
    ProductMarketAnalysis,
    ProductPriceTrend,
    ProductValuationForecast,
} from "../../../types";
import type { StreamingQueryState } from "../../shared/streaming/productManagementStreamingTypes";
import { ProductPriceTrendSection } from "../price-trend/ProductPriceTrendSection";
import { ProductValuationForecastSection } from "../valuation-forecast/ProductValuationForecastSection";
import { formatPrice, formatSignedPercent } from "./formatters";
import { MarketAnalysisPriceDistribution } from "./MarketAnalysisPriceDistribution";
import { MarketAnalysisRecommendation } from "./MarketAnalysisRecommendation";
import { MarketAnalysisSummaryMetrics } from "./MarketAnalysisSummaryMetrics";

function MetricRow({
    label,
    value,
    valueClassName,
}: {
    label: string;
    value: string;
    valueClassName?: string;
}) {
    return (
        <div className="flex items-center justify-between gap-4 border-b border-[#d3d3d3] py-[6px] text-[16px] leading-[25px]">
            <span className="font-semibold tracking-[0.5px] text-[#464646]">{label}</span>
            <span className={cn("font-semibold tracking-[0.5px] text-[#83889e]", valueClassName)}>
                {value}
            </span>
        </div>
    );
}

export function MarketAnalysisContent({
    analysis,
    priceTrendQuery,
    valuationForecastQuery,
    summaryOnly = false,
}: {
    analysis: ProductMarketAnalysis;
    priceTrendQuery: StreamingQueryState<ProductPriceTrend>;
    valuationForecastQuery: StreamingQueryState<ProductValuationForecast>;
    summaryOnly?: boolean;
}) {
    const isBuyerView = analysis.recommendation === "BUY" || analysis.recommendation === "WAIT";

    if (summaryOnly) {
        return (
            <>
                <MarketAnalysisRecommendation analysis={analysis} />
                <div className="bg-[#fafbff] px-10 py-[30px]">
                    <MarketAnalysisSummaryMetrics
                        summary={analysis.summary}
                        isBuyerView={isBuyerView}
                    />
                </div>
            </>
        );
    }

    return (
        <>
            <MarketAnalysisRecommendation analysis={analysis} />
            <div className="flex flex-col gap-5 bg-[#fafbff] px-10 py-[30px]">
                <MarketAnalysisSummaryMetrics
                    summary={analysis.summary}
                    isBuyerView={isBuyerView}
                />
                <div className="grid gap-[30px] lg:grid-cols-2">
                    <div className="flex min-w-0 flex-col justify-center gap-10 rounded-[20px] py-5">
                        <div className="flex flex-col gap-[10px]">
                            <div className="flex items-center gap-2 px-[10px] text-[16px] leading-[25px] font-semibold tracking-[0.5px] text-[#6653fb]">
                                <span aria-hidden="true">✦</span>
                                <span>AI 추천 가격</span>
                            </div>
                            <div className="flex items-center justify-between gap-3 bg-[#6653fb] p-[10px]">
                                <span className="text-[20px] leading-[30px] font-semibold tracking-[0.5px] text-white">
                                    {formatPrice(analysis.suggestedPrice)}
                                </span>
                                {isBuyerView ? (
                                    <span className="rounded-full bg-white px-4 py-[6px] text-[13px] leading-5 font-semibold tracking-[-0.5px] text-[#6653fb]">
                                        구매 고려 가격
                                    </span>
                                ) : (
                                    <button
                                        type="button"
                                        className="rounded-full bg-white px-4 py-[6px] text-[13px] leading-5 font-semibold tracking-[-0.5px] text-[#6653fb]"
                                    >
                                        추천 가격으로 변경
                                    </button>
                                )}
                            </div>
                        </div>
                        <div>
                            <MetricRow
                                label={isBuyerView ? "현재 가격" : "현재 등록가"}
                                value={formatPrice(analysis.currentPrice)}
                            />
                            <MetricRow
                                label="최근 평균 거래가"
                                value={formatPrice(analysis.averagePrice)}
                                valueClassName="text-[#ce3838]"
                            />
                            <MetricRow
                                label="시세 대비"
                                value={formatSignedPercent(analysis.marketPriceDiffRate)}
                                valueClassName="text-[#6653fb]"
                            />
                        </div>
                    </div>
                    <MarketAnalysisPriceDistribution analysis={analysis} />
                </div>
                <ProductPriceTrendSection query={priceTrendQuery} />
                <ProductValuationForecastSection query={valuationForecastQuery} />
            </div>
        </>
    );
}
