"use client";

import type {
    ProductMarketAnalysis,
    ProductPriceTrend,
    ProductValuationForecast,
} from "../../../types";
import type { StreamingQueryState } from "../../shared/streaming/productManagementStreamingTypes";
import { MarketAnalysisContent } from "./MarketAnalysisContent";
import { MarketAnalysisSkeleton } from "./MarketAnalysisSkeleton";

type MarketAnalysisSectionProps = {
    result: ProductMarketAnalysis | null | undefined;
    error: unknown;
    isPending: boolean;
    priceTrendQuery: StreamingQueryState<ProductPriceTrend>;
    valuationForecastQuery: StreamingQueryState<ProductValuationForecast>;
};

export function MarketAnalysisSection({
    result,
    error,
    isPending,
    priceTrendQuery,
    valuationForecastQuery,
}: MarketAnalysisSectionProps) {
    return (
        <div className="flex min-w-0 flex-col gap-2">
            <div className="flex items-center gap-[10px]">
                <span className="flex size-12 items-center justify-center rounded-[12px] bg-gradient-to-b from-[#6653fb] to-[#b1a9ef] text-[22px] leading-[33px] text-white">
                    ✦
                </span>
                <h2
                    id="product-market-analysis-title"
                    className="text-[30px] leading-[42px] font-bold tracking-[0.5px] text-[#6653fb]"
                >
                    AI 시세 분석
                </h2>
            </div>
            <section
                aria-labelledby="product-market-analysis-title"
                className="w-full overflow-hidden rounded-[16px] border border-[#83889e] bg-[#fafbff] shadow-[0_1px_3px_0_rgba(0,0,0,0.04)]"
            >
                {isPending ? (
                    <MarketAnalysisSkeleton
                        priceTrendQuery={priceTrendQuery}
                        valuationForecastQuery={valuationForecastQuery}
                    />
                ) : error ? (
                    <p className="bg-white px-6 py-16 text-center text-[14px] leading-6 text-[#d65353]">
                        시세 분석 데이터를 불러오지 못했습니다.
                    </p>
                ) : result ? (
                    <MarketAnalysisContent
                        analysis={result}
                        priceTrendQuery={priceTrendQuery}
                        valuationForecastQuery={valuationForecastQuery}
                    />
                ) : result === null ? (
                    <p className="bg-white px-6 py-16 text-center text-[14px] leading-6 text-[#83889e]">
                        아직 시세 분석 결과가 없어요. 비슷한 매물이 모이면 분석해 드릴게요.
                    </p>
                ) : null}
            </section>
        </div>
    );
}
