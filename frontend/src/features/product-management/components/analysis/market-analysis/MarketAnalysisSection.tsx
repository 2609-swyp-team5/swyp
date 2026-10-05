"use client";

import type {
    ProductMarketAnalysis,
    ProductPriceTrend,
    ProductValuationForecast,
} from "../../../types";
import type { StreamingQueryState } from "../../shared/streaming/productManagementStreamingTypes";
import { MarketAnalysisContent } from "./MarketAnalysisContent";
import { MarketAnalysisRecommendation } from "./MarketAnalysisRecommendation";
import { MarketAnalysisSkeleton } from "./MarketAnalysisSkeleton";
import { MarketAnalysisSummaryMetrics } from "./MarketAnalysisSummaryMetrics";

type SaleStatsSummary = Extract<ProductMarketAnalysis["summary"], { type: "SALE_STATS" }>;

type MarketAnalysisSectionProps = {
    result: ProductMarketAnalysis | null | undefined;
    error: unknown;
    isPending: boolean;
    priceTrendQuery: StreamingQueryState<ProductPriceTrend>;
    valuationForecastQuery: StreamingQueryState<ProductValuationForecast>;
    /**
     * 판매자 간단 보기 — 넘기면 추천 상태·사유와 이 판매 현황(판매 기간·조회수·관심 수)만 보여주고 AI 추천 가격·중고시세·가격 변화
     * 추이·감가 상각률은 숨긴다. 판매 현황은 분석이 없어도 보여준다.
     */
    sellerSaleStats?: Omit<SaleStatsSummary, "type">;
    /** 요약 보기 — 추천 상태·사유와 요약 지표만 보여주고 AI 추천 가격·가격 분포·가격 변화 추이·감가 상각률은 숨긴다. */
    summaryOnly?: boolean;
};

function SellerSaleStats({ stats }: { stats: Omit<SaleStatsSummary, "type"> }) {
    return (
        <div className="bg-[#fafbff] px-10 py-[30px]">
            <MarketAnalysisSummaryMetrics summary={{ type: "SALE_STATS", ...stats }} />
        </div>
    );
}

export function MarketAnalysisSection({
    result,
    error,
    isPending,
    priceTrendQuery,
    valuationForecastQuery,
    sellerSaleStats,
    summaryOnly = false,
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
                {sellerSaleStats ? (
                    <>
                        {isPending ? (
                            <p
                                role="status"
                                className="bg-white px-6 py-16 text-center text-[14px] leading-6 text-[#83889e]"
                            >
                                시세 분석을 불러오는 중입니다.
                            </p>
                        ) : error ? (
                            <p className="bg-white px-6 py-16 text-center text-[14px] leading-6 text-[#d65353]">
                                시세 분석 데이터를 불러오지 못했습니다.
                            </p>
                        ) : result ? (
                            <MarketAnalysisRecommendation analysis={result} />
                        ) : (
                            <p className="bg-white px-6 py-16 text-center text-[14px] leading-6 text-[#83889e]">
                                아직 시세 분석 결과가 없어요. 비슷한 매물이 모이면 분석해 드릴게요.
                            </p>
                        )}
                        <SellerSaleStats stats={sellerSaleStats} />
                    </>
                ) : isPending && summaryOnly ? (
                    <p
                        role="status"
                        aria-label="AI 시세 분석을 불러오는 중"
                        className="bg-white px-6 py-16 text-center text-[14px] leading-6 text-[#83889e]"
                    >
                        시세 분석을 불러오는 중입니다.
                    </p>
                ) : isPending ? (
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
                        summaryOnly={summaryOnly}
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
