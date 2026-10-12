"use client";

import { useState } from "react";

import { getApiErrorMessage } from "@/common/lib/api/error";

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
    variant?: "default" | "management";
    isDetailsOpen?: boolean;
    onDetailsOpenChange?: (open: boolean) => void;
    analysisRetry?: {
        isFetching: boolean;
        refetch: () => Promise<unknown>;
    };
};

function AnalysisHeader({ variant }: { variant: "default" | "management" }) {
    return (
        <div className="flex items-center gap-[10px]">
            <span className="flex size-12 items-center justify-center rounded-[12px] bg-gradient-to-b from-[#6653fb] to-[#b1a9ef] text-[22px] leading-[33px] text-white">
                ✦
            </span>
            <h2
                id="product-market-analysis-title"
                className={
                    variant === "management"
                        ? "text-[22px] leading-[30px] font-semibold tracking-[0.5px] text-[#6653fb]"
                        : "text-[30px] leading-[42px] font-bold tracking-[0.5px] text-[#6653fb]"
                }
            >
                AI 시세 분석
            </h2>
        </div>
    );
}

function RetryButton({
    analysisRetry,
    label,
}: {
    analysisRetry?: MarketAnalysisSectionProps["analysisRetry"];
    label: string;
}) {
    if (!analysisRetry) {
        return null;
    }

    return (
        <button
            type="button"
            className="rounded-full border border-[#6653fb] px-5 py-2 text-[13px] leading-5 font-semibold text-[#6653fb] disabled:cursor-wait disabled:opacity-50"
            disabled={analysisRetry.isFetching}
            onClick={() => void analysisRetry.refetch()}
        >
            {analysisRetry.isFetching ? "재시도 중..." : label}
        </button>
    );
}

export function MarketAnalysisSection({
    result,
    error,
    isPending,
    priceTrendQuery,
    valuationForecastQuery,
    variant = "default",
    isDetailsOpen: controlledIsDetailsOpen,
    onDetailsOpenChange,
    analysisRetry,
}: MarketAnalysisSectionProps) {
    const [uncontrolledIsDetailsOpen, setUncontrolledIsDetailsOpen] = useState(false);
    const isManagementVariant = variant === "management";
    const isDetailsOpen = isManagementVariant
        ? (controlledIsDetailsOpen ?? uncontrolledIsDetailsOpen)
        : true;
    const handleDetailsOpenChange = (open: boolean) => {
        setUncontrolledIsDetailsOpen(open);
        onDetailsOpenChange?.(open);
    };

    const analysisBody = isPending ? (
        isManagementVariant ? (
            <div
                aria-label="AI 시세 분석을 불러오는 중"
                className="flex min-h-[260px] flex-col items-center justify-center gap-3 bg-white px-6 py-16 text-center"
            >
                <p className="text-[16px] leading-6 font-semibold text-[#6653fb]">
                    AI 시세 분석 대기 중이에요.
                </p>
                <p className="text-[13px] leading-5 text-[#83889e]">잠시만 기다려 주세요.</p>
            </div>
        ) : (
            <MarketAnalysisSkeleton
                priceTrendQuery={priceTrendQuery}
                valuationForecastQuery={valuationForecastQuery}
            />
        )
    ) : error ? (
        isManagementVariant ? (
            <div className="flex min-h-[260px] flex-col items-center justify-center gap-4 bg-white px-6 py-16 text-center">
                <p className="text-[14px] leading-6 text-[#d65353]">{getApiErrorMessage(error)}</p>
                <RetryButton analysisRetry={analysisRetry} label="다시 시도" />
            </div>
        ) : (
            <p className="bg-white px-6 py-16 text-center text-[14px] leading-6 text-[#d65353]">
                시세 분석 데이터를 불러오지 못했습니다.
            </p>
        )
    ) : result ? (
        <MarketAnalysisContent
            analysis={result}
            priceTrendQuery={priceTrendQuery}
            valuationForecastQuery={valuationForecastQuery}
            variant={variant}
            isDetailsOpen={isDetailsOpen}
            onDetailsOpenChange={handleDetailsOpenChange}
        />
    ) : result === null ? (
        isManagementVariant ? (
            <div className="flex min-h-[260px] flex-col items-center justify-center gap-3 bg-white px-6 py-16 text-center">
                <p className="text-[16px] leading-6 font-semibold text-[#363636]">
                    아직 시세 분석 결과가 없어요.
                </p>
                <p className="text-[13px] leading-5 text-[#83889e]">
                    비슷한 매물이 모이면 분석해 드릴게요.
                </p>
                <RetryButton analysisRetry={analysisRetry} label="분석 다시 시도" />
            </div>
        ) : (
            <p className="bg-white px-6 py-16 text-center text-[14px] leading-6 text-[#83889e]">
                아직 시세 분석 결과가 없어요. 비슷한 매물이 모이면 분석해 드릴게요.
            </p>
        )
    ) : null;

    if (isManagementVariant) {
        return (
            <section
                aria-labelledby="product-market-analysis-title"
                className="w-full overflow-hidden rounded-[16px] border border-[#83889e] bg-white shadow-[0_1px_3px_0_rgba(0,0,0,0.04)]"
            >
                <div className="px-[30px] pt-10 pb-5">
                    <AnalysisHeader variant="management" />
                </div>
                {analysisBody}
            </section>
        );
    }

    return (
        <div className="flex min-w-0 flex-col gap-2">
            <AnalysisHeader variant="default" />
            <section
                aria-labelledby="product-market-analysis-title"
                className="w-full overflow-hidden rounded-[16px] border border-[#83889e] bg-[#fafbff] shadow-[0_1px_3px_0_rgba(0,0,0,0.04)]"
            >
                {analysisBody}
            </section>
        </div>
    );
}
