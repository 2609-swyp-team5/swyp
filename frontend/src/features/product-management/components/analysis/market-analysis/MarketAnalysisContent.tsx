import { ArrowRight, ChevronRight, ChevronUp, Sparkles } from "lucide-react";
import Image from "next/image";

import { Button } from "@/common/components/ui/Button";
import { cn } from "@/common/lib/utils";

import type {
    ProductCompetition,
    ProductMarketAnalysis,
    ProductPriceDistribution,
    ProductPriceTrend,
    ProductValuationForecast,
} from "../../../types";
import type { StreamingQueryState } from "../../shared/streaming/productManagementStreamingTypes";
import { ProductCompetitionSection } from "../../competition/ProductCompetitionSection";
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
    competitionQuery,
    priceDistributionQuery,
    priceTrendQuery,
    valuationForecastQuery,
    variant = "default",
    isDetailsOpen = true,
    onDetailsOpenChange,
    onRecommendedPriceChange,
    isRecommendedPriceChanging = false,
    canChangeRecommendedPrice = true,
}: {
    analysis: ProductMarketAnalysis;
    competitionQuery?: StreamingQueryState<ProductCompetition>;
    priceDistributionQuery?: StreamingQueryState<ProductPriceDistribution>;
    priceTrendQuery: StreamingQueryState<ProductPriceTrend>;
    valuationForecastQuery: StreamingQueryState<ProductValuationForecast>;
    variant?: "default" | "management" | "sold";
    isDetailsOpen?: boolean;
    onDetailsOpenChange?: (open: boolean) => void;
    onRecommendedPriceChange?: () => void;
    isRecommendedPriceChanging?: boolean;
    canChangeRecommendedPrice?: boolean;
}) {
    const isBuyerView = analysis.recommendation === "BUY" || analysis.recommendation === "WAIT";
    if (variant === "management" || variant === "sold") {
        return (
            <div className="flex flex-col bg-white">
                {variant === "management" ? (
                    <div className="px-[30px] pb-5">
                        <div className="rounded-[10px] bg-[#fafbff] px-[30px] py-5">
                            <MarketAnalysisRecommendation
                                analysis={analysis}
                                variant="management"
                            />
                            <div className="mt-5 flex flex-col items-end gap-[10px]">
                                <MarketAnalysisSummaryMetrics
                                    analysis={analysis}
                                    variant="management"
                                />
                                {analysis.recommendation === "SELL" && canChangeRecommendedPrice ? (
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        disabled={
                                            !onRecommendedPriceChange ||
                                            isRecommendedPriceChanging ||
                                            analysis.suggestedPrice === null
                                        }
                                        onClick={onRecommendedPriceChange}
                                        className="h-auto gap-1 rounded-none p-0 text-[13px] leading-5 font-semibold tracking-[-0.5px] text-[#6653fb] hover:bg-transparent hover:text-[#6653fb]"
                                    >
                                        {isRecommendedPriceChanging
                                            ? "변경 중..."
                                            : "추천 가격으로 변경"}
                                        <ArrowRight aria-hidden="true" className="size-4" />
                                    </Button>
                                ) : null}
                            </div>
                        </div>
                    </div>
                ) : null}

                <div
                    className={cn(
                        "bg-white",
                        variant === "management"
                            ? "border-t border-[#d3d3d3] px-[50px] py-[30px]"
                            : "px-[20px] py-[30px]",
                    )}
                >
                    <button
                        type="button"
                        aria-expanded={isDetailsOpen}
                        className="flex w-full items-start justify-between gap-5 text-left"
                        onClick={() => onDetailsOpenChange?.(!isDetailsOpen)}
                    >
                        <span className="flex min-w-0 flex-col gap-2.5">
                            <span className="flex items-center gap-2.5 text-[22px] leading-[30px] font-semibold tracking-[0.5px] text-[#363636]">
                                <Sparkles aria-hidden="true" className="size-5 fill-[#363636]" />
                                상세 시세 분석 보기
                            </span>
                            <span className="text-[16px] leading-[25px] text-[#464646]">
                                최근 30일 거래 데이터, 경쟁 상품 수를 종합해 타이밍을 분석합니다.
                            </span>
                        </span>
                        <span className="flex shrink-0 items-center gap-[3px] text-[16px] leading-[25px] text-[#83889e]">
                            {isDetailsOpen ? "내용 접기" : "더보기"}
                            {isDetailsOpen ? (
                                <ChevronUp aria-hidden="true" className="size-4" />
                            ) : (
                                <ChevronRight aria-hidden="true" className="size-4" />
                            )}
                        </span>
                    </button>
                </div>

                {isDetailsOpen ? (
                    <div
                        className={cn(
                            "flex flex-col",
                            variant === "management"
                                ? "gap-5 px-[30px] pb-[30px]"
                                : "gap-5 px-[20px] pb-[20px]",
                        )}
                    >
                        <MarketAnalysisPriceDistribution
                            analysis={analysis}
                            query={priceDistributionQuery}
                        />
                        <ProductPriceTrendSection query={priceTrendQuery} />
                        <ProductValuationForecastSection query={valuationForecastQuery} />
                        {variant !== "sold" && competitionQuery ? (
                            <ProductCompetitionSection
                                query={competitionQuery}
                                variant="management"
                            />
                        ) : null}
                    </div>
                ) : null}
            </div>
        );
    }

    return (
        <>
            <MarketAnalysisRecommendation analysis={analysis} variant={variant} />
            <div className="flex flex-col gap-5 bg-[#fafbff] px-10 py-[30px]">
                <MarketAnalysisSummaryMetrics analysis={analysis} variant={variant} />
                <div className="grid gap-[30px] lg:grid-cols-2">
                    <div className="flex min-w-0 flex-col justify-center gap-10 rounded-[20px] py-5">
                        <div className="flex flex-col gap-[10px]">
                            <div className="flex items-center gap-2 px-[10px]">
                                <Image
                                    src="/figma/product-management/ai-recommended-price.svg"
                                    alt=""
                                    width={15}
                                    height={15}
                                    aria-hidden="true"
                                />
                                <span className="text-[16px] leading-[25px] font-semibold tracking-[0.5px] text-[#6653fb]">
                                    AI 추천 가격
                                </span>
                            </div>
                            <div className="flex items-center justify-between gap-3 rounded-[5px] bg-[#6653fb] p-[10px]">
                                <span className="text-[20px] leading-[30px] font-medium tracking-[0.5px] text-white">
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
                        <div className="flex flex-col gap-[10px] px-[20px]">
                            <MetricRow
                                label={isBuyerView ? "현재 가격" : "현재 등록가"}
                                value={formatPrice(analysis.currentPrice)}
                            />
                            <MetricRow
                                label="최근 평균 거래가"
                                value={formatPrice(analysis.averagePrice)}
                                valueClassName="text-[20px] leading-[30px] font-medium text-[#ce3838]"
                            />
                            <MetricRow
                                label="시세 대비"
                                value={formatSignedPercent(analysis.marketPriceDiffRate)}
                                valueClassName="text-[#6653fb]"
                            />
                        </div>
                    </div>
                    <MarketAnalysisPriceDistribution
                        analysis={analysis}
                        query={priceDistributionQuery}
                    />
                </div>
                <ProductPriceTrendSection query={priceTrendQuery} />
                <ProductValuationForecastSection query={valuationForecastQuery} />
            </div>
        </>
    );
}
