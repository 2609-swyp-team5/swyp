"use client";

import { useEffect, useState } from "react";
import { ChevronRight, Sparkles } from "lucide-react";
import Image from "next/image";

import { getApiErrorMessage } from "@/common/lib/api/error";

import type {
    ProductCompetition,
    ProductMarketAnalysis,
    ProductManagementPerspective,
    ProductPriceDistribution,
    ProductPriceTrend,
    ProductValuationForecast,
} from "../../../types";
import type { StreamingQueryState } from "../../shared/streaming/productManagementStreamingTypes";
import { MarketAnalysisContent } from "./MarketAnalysisContent";
import { MarketAnalysisManagementSkeleton } from "./MarketAnalysisManagementSkeleton";
import { MarketAnalysisSkeleton } from "./MarketAnalysisSkeleton";
import { ProductAnalysisRetryDialog } from "./ProductAnalysisRetryDialog";
import { formatPrice } from "./formatters";
import type { ProductAnalysisStreamStep } from "../../../schemas/productAnalysisStreamSchema";
import type { ProductAnalysisRetryNotice } from "../../../hooks/useRequestProductAnalysisMutation";

type MarketAnalysisSectionProps = {
    result: ProductMarketAnalysis | null | undefined;
    competitionQuery?: StreamingQueryState<ProductCompetition>;
    priceDistributionQuery?: StreamingQueryState<ProductPriceDistribution>;
    error: unknown;
    isPending: boolean;
    priceTrendQuery: StreamingQueryState<ProductPriceTrend>;
    valuationForecastQuery: StreamingQueryState<ProductValuationForecast>;
    perspective?: ProductManagementPerspective;
    variant?: "default" | "management" | "sold";
    isDetailsOpen?: boolean;
    onDetailsOpenChange?: (open: boolean) => void;
    onRecommendedPriceChange?: () => Promise<unknown>;
    isRecommendedPriceChanging?: boolean;
    canChangeRecommendedPrice?: boolean;
    analysisRetry?: {
        isFetching: boolean;
        isProcessing?: boolean;
        refetch: () => Promise<unknown>;
        request?: () => Promise<unknown>;
        progress?: (Omit<ProductAnalysisStreamStep, "event"> & { message: string }) | null;
        notice?: ProductAnalysisRetryNotice | null;
        error?: unknown;
        reset?: () => void;
    };
};

function AnalysisHeader({
    variant,
    analysisRetry,
    onRequest,
}: {
    variant: "default" | "management";
    analysisRetry?: MarketAnalysisSectionProps["analysisRetry"];
    onRequest?: () => Promise<unknown> | undefined;
}) {
    return (
        <div className="flex w-full items-center justify-between gap-4">
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
            {analysisRetry?.request ? (
                <button
                    type="button"
                    className="flex h-[31px] shrink-0 cursor-pointer items-center justify-center gap-[5px] rounded-[50px] border-[0.5px] border-[#83889e] px-[15px] py-[5px] text-[12px] leading-5 tracking-[-0.5px] text-[#83889e] disabled:cursor-wait disabled:opacity-50"
                    disabled={analysisRetry.isFetching}
                    onClick={() => void onRequest?.()}
                >
                    <Image src="/sell/ai-analysis-retry.svg" alt="" width={12} height={12} />
                    {analysisRetry.isFetching ? "재시도 중..." : "AI 분석 재시도"}
                </button>
            ) : null}
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

function PendingAnalysisCard({ perspective }: { perspective: ProductManagementPerspective }) {
    const timingLabel = perspective === "BUY" ? "구매" : "판매";

    return (
        <div className="relative min-h-[300px] overflow-hidden rounded-[16px] bg-[#fafbff]">
            <div className="relative z-10 flex min-h-[300px] items-center px-6 py-8 md:px-[30px] md:py-[30px]">
                <div className="flex w-full flex-col gap-[10px] text-[#363636] md:w-[290px]">
                    <h3 className="text-[22px] leading-[30px] font-semibold tracking-[0.5px]">
                        {timingLabel} 타이밍을 분석하고 있어요
                    </h3>
                    <p className="text-[16px] leading-[25px]">
                        비슷한 매물과 최근 시세를 비교하고 있어요.
                        <br />
                        분석이 완료되면 결과를 보여드릴게요.
                    </p>
                </div>
                <Image
                    src="/figma/product-management/analysis-pending.svg"
                    alt=""
                    width={390}
                    height={271}
                    aria-hidden="true"
                    className="pointer-events-none absolute top-[40px] right-[30px] mt-1.5 hidden h-auto w-[380px] max-w-[52%] object-contain md:block"
                />
                <Image
                    src="/figma/product-management/analysis-pending.svg"
                    alt=""
                    width={390}
                    height={271}
                    aria-hidden="true"
                    className="pointer-events-none mt-6 block h-auto w-full max-w-[400px] object-contain md:hidden"
                />
            </div>
        </div>
    );
}

function SoldAnalysisTrigger({ onClick }: { onClick: () => void }) {
    return (
        <div className="bg-white px-[20px] py-[30px]">
            <button
                type="button"
                className="flex w-full items-start justify-between gap-5 text-left"
                onClick={onClick}
            >
                <span className="flex min-w-0 flex-col gap-2.5">
                    <span className="flex items-center gap-2.5 text-[22px] leading-[30px] font-semibold tracking-[0.5px] text-[#363636]">
                        <Sparkles aria-hidden="true" className="size-5 fill-[#363636]" />
                        상세 시세 분석 보기
                    </span>
                    <span className="text-[16px] leading-[25px] text-[#464646]">
                        최근 30일 거래 데이터를 종합해 타이밍을 분석합니다.
                    </span>
                </span>
                <span className="flex shrink-0 items-center gap-[3px] text-[16px] leading-[25px] text-[#83889e]">
                    더보기
                    <ChevronRight aria-hidden="true" className="size-4" />
                </span>
            </button>
        </div>
    );
}

export function MarketAnalysisSection({
    result,
    competitionQuery,
    priceDistributionQuery,
    error,
    isPending,
    priceTrendQuery,
    valuationForecastQuery,
    perspective = "SELL",
    variant = "default",
    isDetailsOpen: controlledIsDetailsOpen,
    onDetailsOpenChange,
    onRecommendedPriceChange,
    isRecommendedPriceChanging = false,
    canChangeRecommendedPrice = true,
    analysisRetry,
}: MarketAnalysisSectionProps) {
    const [uncontrolledIsDetailsOpen, setUncontrolledIsDetailsOpen] = useState(false);
    const [isRetryDialogDismissed, setIsRetryDialogDismissed] = useState(false);
    const [priceChangeFeedback, setPriceChangeFeedback] = useState<{
        type: "success" | "error";
        message: string;
        recommendedPrice?: number | null;
    } | null>(null);
    const isManagementVariant = variant === "management";
    const isSoldVariant = variant === "sold";
    const isDetailsOpen =
        isManagementVariant || isSoldVariant
            ? (controlledIsDetailsOpen ?? uncontrolledIsDetailsOpen)
            : true;
    const handleDetailsOpenChange = (open: boolean) => {
        setUncontrolledIsDetailsOpen(open);
        onDetailsOpenChange?.(open);
    };

    const handleRecommendedPriceChange = async () => {
        if (!onRecommendedPriceChange) {
            return;
        }

        try {
            await onRecommendedPriceChange();
            setPriceChangeFeedback({
                type: "success",
                message: "추천 가격으로 변경했습니다!",
                recommendedPrice: result?.suggestedPrice ?? null,
            });
        } catch (error) {
            setPriceChangeFeedback({
                type: "error",
                message: getApiErrorMessage(error),
            });
        }
    };

    useEffect(() => {
        if (!priceChangeFeedback) {
            return;
        }

        const timer = window.setTimeout(() => setPriceChangeFeedback(null), 2500);
        return () => window.clearTimeout(timer);
    }, [priceChangeFeedback]);

    const analysisBody = isPending ? (
        isManagementVariant ? (
            <MarketAnalysisManagementSkeleton />
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
            competitionQuery={competitionQuery}
            priceDistributionQuery={priceDistributionQuery}
            priceTrendQuery={priceTrendQuery}
            valuationForecastQuery={valuationForecastQuery}
            variant={variant}
            isDetailsOpen={isDetailsOpen}
            onDetailsOpenChange={handleDetailsOpenChange}
            onRecommendedPriceChange={
                onRecommendedPriceChange ? handleRecommendedPriceChange : undefined
            }
            isRecommendedPriceChanging={isRecommendedPriceChanging}
            canChangeRecommendedPrice={canChangeRecommendedPrice}
        />
    ) : result === null ? (
        isManagementVariant ? (
            <div className="px-[30px] pb-5">
                <PendingAnalysisCard perspective={perspective} />
            </div>
        ) : (
            <p className="bg-white px-6 py-16 text-center text-[14px] leading-6 text-[#83889e]">
                아직 시세 분석 결과가 없어요. 비슷한 매물이 모이면 분석해 드릴게요.
            </p>
        )
    ) : null;

    const retryDialogOpen =
        !isRetryDialogDismissed &&
        Boolean(analysisRetry?.isProcessing || analysisRetry?.error || analysisRetry?.notice);

    const handleAnalysisRetryRequest = () => {
        setIsRetryDialogDismissed(false);
        return analysisRetry?.request?.();
    };

    const priceChangeToast = priceChangeFeedback ? (
        <div
            role={priceChangeFeedback.type === "error" ? "alert" : "status"}
            aria-live="polite"
            className={
                priceChangeFeedback.type === "error"
                    ? "fixed top-[calc(var(--header-height)+32px)] left-1/2 z-50 -translate-x-1/2 rounded-xl border border-[#f2b8b5] bg-[#fff4f4] px-5 py-3 text-[14px] leading-5 font-semibold text-[#d65353] shadow-[0_8px_24px_rgba(54,51,100,0.18)]"
                    : "fixed top-[calc(var(--header-height)+32px)] left-1/2 z-50 flex w-[min(calc(100vw-32px),422px)] -translate-x-1/2 flex-col items-center justify-center rounded-[16px] border border-[#dee5ed] bg-white p-[33px] shadow-[0_8px_24px_rgba(54,51,100,0.18)]"
            }
        >
            {priceChangeFeedback.type === "success" ? (
                <div className="flex w-full max-w-[354px] flex-col items-center gap-[35px] text-center">
                    <div className="flex w-full flex-col items-center">
                        <p className="text-[20px] leading-[30px] font-bold text-[#545d82]">
                            {priceChangeFeedback.message}
                        </p>
                        <p className="pt-1 text-[14px] leading-[21px] text-[#6b7395]">
                            AI가 가격 변화를 추적하고 좋은 시점에 알려드릴게요.
                        </p>
                    </div>
                    <div className="flex w-full flex-col items-center justify-center bg-[#fafbff] py-2.5 text-[#6653fb]">
                        <span className="text-[16px] leading-[25px] font-semibold tracking-[0.5px]">
                            추천 가격
                        </span>
                        <strong className="text-[22px] leading-[30px] font-semibold tracking-[0.5px]">
                            {formatPrice(priceChangeFeedback.recommendedPrice ?? null)}
                        </strong>
                    </div>
                </div>
            ) : (
                priceChangeFeedback.message
            )}
        </div>
    ) : null;

    if (isSoldVariant && !isDetailsOpen && (isPending || (!result && !error))) {
        return (
            <section
                aria-label="판매완료 상품 시세 분석"
                className="w-full overflow-hidden rounded-[16px] border border-[#dedee6] bg-white"
            >
                <SoldAnalysisTrigger onClick={() => handleDetailsOpenChange(true)} />
            </section>
        );
    }

    if (isManagementVariant) {
        return (
            <>
                <ProductAnalysisRetryDialog
                    open={retryDialogOpen}
                    progress={analysisRetry?.progress ?? null}
                    notice={analysisRetry?.notice ?? null}
                    error={analysisRetry?.error}
                    onClose={() => {
                        setIsRetryDialogDismissed(true);
                    }}
                    onClosed={() => analysisRetry?.reset?.()}
                    onRetry={() => {
                        setIsRetryDialogDismissed(false);
                        analysisRetry?.reset?.();
                        void analysisRetry?.request?.();
                    }}
                />
                {priceChangeToast}
                <section
                    aria-labelledby="product-market-analysis-title"
                    className="w-full overflow-hidden rounded-[16px] border border-[#83889e] bg-white shadow-[0_1px_3px_0_rgba(0,0,0,0.04)]"
                >
                    <div className="px-[30px] pt-10 pb-5">
                        <AnalysisHeader
                            variant="management"
                            analysisRetry={analysisRetry}
                            onRequest={handleAnalysisRetryRequest}
                        />
                    </div>
                    {analysisBody}
                </section>
            </>
        );
    }

    if (isSoldVariant) {
        return (
            <section
                aria-label="판매완료 상품 시세 분석"
                className="w-full overflow-hidden rounded-[16px] border border-[#dedee6] bg-white"
            >
                {analysisBody}
            </section>
        );
    }

    return (
        <>
            {priceChangeToast}
            <div className="flex min-w-0 flex-col gap-2">
                <AnalysisHeader variant="default" analysisRetry={analysisRetry} />
                <section
                    aria-labelledby="product-market-analysis-title"
                    className="w-full overflow-hidden rounded-[16px] border border-[#83889e] bg-[#fafbff] shadow-[0_1px_3px_0_rgba(0,0,0,0.04)]"
                >
                    {analysisBody}
                </section>
            </div>
        </>
    );
}
