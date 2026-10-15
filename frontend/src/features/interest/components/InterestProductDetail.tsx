"use client";

import { useEffect, useState } from "react";

import { getApiErrorMessage } from "@/common/lib/api/error";
import { Button } from "@/common/components/ui/Button";
import { clearSelectedProductId } from "@/features/product-management/hooks/useSelectedProductId";
import { useProductManagementSectionsQuery } from "@/features/product-management/hooks/useProductManagementSectionsQuery";
import { MarketAnalysisSection } from "@/features/product-management/components/analysis/market-analysis/MarketAnalysisSection";
import { ProductSummaryCard } from "@/features/product-management/components/product-summary/ProductSummaryCard";
import { ProductSummarySkeleton } from "@/features/product-management/components/product-summary/ProductSummarySkeleton";
import { TargetPriceSaveToast } from "@/features/product-management/components/target-price/TargetPriceSaveToast";
import { canSetInterestTargetPrice } from "@/features/product-management/components/target-price/targetPriceAvailability";
import { formatSignedPercent } from "@/features/product-management/components/analysis/market-analysis/formatters";
import { useNotificationSettingsQuery } from "@/features/notifications/hooks/queries/useNotificationSettingsQuery";
import { useRequestProductAnalysisMutation } from "@/features/product-management/hooks/useRequestProductAnalysisMutation";
import { ManagementTargetPriceCard } from "@/features/product-management/components/target-price/ManagementTargetPriceCard";
import { useDeleteInterestMutation } from "../hooks/mutations/useDeleteInterestMutation";
import { useSetInterestTargetPriceMutation } from "../hooks/mutations/useSetInterestTargetPriceMutation";
import type { InterestListItem } from "../types";

const statusLabels: Record<string, string> = {
    DRAFT: "임시저장",
    ON_SALE: "판매중",
    RESERVED: "예약중",
    SOLD_OUT: "판매종료",
};

export function InterestProductDetail({ interest }: { interest: InterestListItem }) {
    const [showAnalysisDetails, setShowAnalysisDetails] = useState(false);
    const [savedTargetPrice, setSavedTargetPrice] = useState<number | null>(null);
    const deleteMutation = useDeleteInterestMutation();
    const targetPriceMutation = useSetInterestTargetPriceMutation(interest.interestId);
    const notificationSettingsQuery = useNotificationSettingsQuery();
    const requestAnalysisMutation = useRequestProductAnalysisMutation();
    const { targetPrice } = interest;
    const sections = useProductManagementSectionsQuery(interest.targetId, {
        perspective: "BUY",
        analysisDetailsEnabled: showAnalysisDetails,
        competitionEnabled: showAnalysisDetails,
    });

    const handleDelete = () => {
        deleteMutation.mutate(
            {
                interestId: interest.interestId,
                source: interest.source,
                targetId: interest.targetId,
            },
            {
                onSuccess: clearSelectedProductId,
            },
        );
    };

    const detailLabel =
        interest.source === "EXTERNAL"
            ? `${interest.platformName ?? "외부 플랫폼"} 매물`
            : (statusLabels[interest.status] ?? interest.status);

    const summaryProduct = sections.productSummary.data;

    useEffect(() => {
        if (savedTargetPrice === null) {
            return;
        }

        const timer = window.setTimeout(() => setSavedTargetPrice(null), 2500);
        return () => window.clearTimeout(timer);
    }, [savedTargetPrice]);

    const handleTargetPriceSave = (value: number | null) => {
        targetPriceMutation.mutate(value, {
            onSuccess: (data) => setSavedTargetPrice(data.targetPrice),
        });
    };

    const handleAnalysisRetry = async () => {
        try {
            await requestAnalysisMutation.mutateAsync({
                productId: interest.targetId,
                perspective: "BUY",
            });
        } catch {
            // mutation.error를 진행 다이얼로그에서 표시한다.
        }
    };

    return (
        <div className="flex min-w-0 flex-col gap-6">
            {savedTargetPrice !== null ? (
                <TargetPriceSaveToast
                    targetPrice={savedTargetPrice}
                    description="상품 가격이 목표가 이하가 되면 알려드릴게요."
                />
            ) : null}
            {sections.productSummary.isPending ? <ProductSummarySkeleton /> : null}
            {summaryProduct ? (
                <ProductSummaryCard
                    product={summaryProduct}
                    interest={{
                        detailLabel,
                        platformName: interest.platformName,
                        externalUrl: interest.externalUrl,
                        deletePending: deleteMutation.isPending,
                        onDelete: handleDelete,
                    }}
                />
            ) : null}
            {deleteMutation.error ? (
                <p className="typography-body-small -mt-4 text-right text-[#d65353]">
                    {getApiErrorMessage(deleteMutation.error)}
                </p>
            ) : null}
            {sections.productSummary.error ? (
                <section className="flex min-h-[539px] flex-col items-center justify-center gap-4 rounded-[20px] border border-[#d3d3d3] bg-white p-6 text-center">
                    <p role="alert" className="typography-body-small text-[#d65353]">
                        {getApiErrorMessage(sections.productSummary.error)}
                    </p>
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => void sections.productSummary.refetch()}
                    >
                        다시 시도
                    </Button>
                </section>
            ) : null}

            {canSetInterestTargetPrice(interest.interestStatus) ? (
                <ManagementTargetPriceCard
                    key={`${interest.interestId}-${targetPrice ?? "none"}`}
                    title="목표 구매가"
                    description="상품 가격이 이 금액 이하가 되면 알려드려요."
                    targetPrice={targetPrice}
                    reference={{
                        label: "현재 AI 추천 구매가",
                        price: sections.productAnalysis.data?.suggestedPrice ?? null,
                        emphasized: true,
                        supportingText:
                            sections.productAnalysis.data?.marketPriceDiffRate == null
                                ? null
                                : `시세 대비 ${formatSignedPercent(sections.productAnalysis.data.marketPriceDiffRate)}`,
                    }}
                    isSaving={targetPriceMutation.isPending}
                    error={targetPriceMutation.error}
                    onSave={handleTargetPriceSave}
                    targetPriceNotificationEnabled={
                        notificationSettingsQuery.data?.targetPriceEnabled
                    }
                />
            ) : null}

            <MarketAnalysisSection
                result={sections.productAnalysis.data}
                error={sections.productAnalysis.error}
                isPending={sections.productAnalysis.isPending}
                competitionQuery={sections.productCompetition}
                priceTrendQuery={sections.productPriceTrend}
                valuationForecastQuery={sections.productValuationForecast}
                priceDistributionQuery={sections.productPriceDistribution}
                perspective="BUY"
                variant="management"
                isDetailsOpen={showAnalysisDetails}
                onDetailsOpenChange={setShowAnalysisDetails}
                analysisRetry={{
                    isFetching:
                        sections.productAnalysis.isFetching || requestAnalysisMutation.isPending,
                    isProcessing: requestAnalysisMutation.isProcessing,
                    refetch: sections.productAnalysis.refetch,
                    request:
                        interest.interestStatus === "SOLD_OUT" ? undefined : handleAnalysisRetry,
                    progress: requestAnalysisMutation.progress,
                    notice: requestAnalysisMutation.notice,
                    error: requestAnalysisMutation.error,
                    reset: requestAnalysisMutation.reset,
                }}
            />
        </div>
    );
}
