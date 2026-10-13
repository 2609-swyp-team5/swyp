"use client";

import { useState } from "react";

import { getApiErrorMessage } from "@/common/lib/api/error";
import type { ProductStatus } from "@/features/sell/types";
import { useProductManagementSectionsQuery } from "../hooks/useProductManagementSectionsQuery";
import { useRequestProductAnalysisMutation } from "../hooks/useRequestProductAnalysisMutation";
import { useUpdateProductPriceMutation } from "../hooks/useUpdateProductPriceMutation";
import { MarketAnalysisSection } from "./analysis/market-analysis/MarketAnalysisSection";
import { ProductSummaryCard } from "./product-summary/ProductSummaryCard";
import { ProductSummarySkeleton } from "./product-summary/ProductSummarySkeleton";
import { SellerTargetPriceSection } from "./target-price/SellerTargetPriceSection";
import { canSetSellerTargetPrice } from "./target-price/targetPriceAvailability";

export function ProductManagementDetail({
    productId,
    initialStatus,
}: {
    productId: number;
    initialStatus?: ProductStatus;
}) {
    const [showAnalysisDetails, setShowAnalysisDetails] = useState(false);
    const updateProductPriceMutation = useUpdateProductPriceMutation();
    const requestAnalysisMutation = useRequestProductAnalysisMutation();

    const sections = useProductManagementSectionsQuery(productId, {
        summaryEnabled: true,
        analysisEnabled: initialStatus !== "SOLD_OUT" || showAnalysisDetails,
        analysisDetailsEnabled: showAnalysisDetails,
        competitionEnabled: initialStatus !== "SOLD_OUT" && showAnalysisDetails,
    });
    const { data, error, isPending } = sections.productSummary;
    const currentStatus = data?.status ?? (isPending ? initialStatus : undefined);
    const handleRecommendedPriceChange = () => {
        const suggestedPrice = sections.productAnalysis.data?.suggestedPrice;
        if (suggestedPrice === undefined || suggestedPrice === null) {
            return Promise.reject(new Error("추천 가격을 불러오지 못했습니다."));
        }

        return updateProductPriceMutation.mutateAsync({
            productId,
            price: suggestedPrice,
        });
    };
    const handleAnalysisRetry = async () => {
        await requestAnalysisMutation.mutateAsync({ productId, force: true });
        await sections.productAnalysis.refetch();
    };

    return (
        <div className="flex w-full min-w-0 flex-col gap-6">
            {isPending ? <ProductSummarySkeleton /> : null}
            {!isPending && error ? (
                <section className="flex min-h-[430px] items-center justify-center rounded-[16px] border border-[#dee5ed] bg-white p-6 text-center">
                    <p className="text-[14px] leading-6 font-medium text-[#d65353]">
                        {getApiErrorMessage(error)}
                    </p>
                </section>
            ) : null}
            {!isPending && !error && data ? (
                <ProductSummaryCard
                    product={data}
                    variant={currentStatus === "SOLD_OUT" ? "sold" : "default"}
                />
            ) : null}
            {currentStatus !== undefined && canSetSellerTargetPrice(currentStatus) ? (
                <SellerTargetPriceSection productId={productId} />
            ) : null}
            {data && currentStatus !== undefined ? (
                <>
                    <MarketAnalysisSection
                        result={sections.productAnalysis.data}
                        error={sections.productAnalysis.error}
                        isPending={sections.productAnalysis.isPending}
                        competitionQuery={sections.productCompetition}
                        priceTrendQuery={sections.productPriceTrend}
                        valuationForecastQuery={sections.productValuationForecast}
                        priceDistributionQuery={sections.productPriceDistribution}
                        perspective="SELL"
                        variant={currentStatus === "SOLD_OUT" ? "sold" : "management"}
                        isDetailsOpen={showAnalysisDetails}
                        onDetailsOpenChange={setShowAnalysisDetails}
                        analysisRetry={{
                            isFetching:
                                sections.productAnalysis.isFetching ||
                                requestAnalysisMutation.isPending,
                            refetch: sections.productAnalysis.refetch,
                            request: currentStatus === "SOLD_OUT" ? undefined : handleAnalysisRetry,
                        }}
                        onRecommendedPriceChange={
                            currentStatus === "SOLD_OUT" ? undefined : handleRecommendedPriceChange
                        }
                        isRecommendedPriceChanging={
                            currentStatus === "SOLD_OUT"
                                ? false
                                : updateProductPriceMutation.isPending
                        }
                        canChangeRecommendedPrice={
                            currentStatus === "DRAFT" || currentStatus === "ON_SALE"
                        }
                    />
                </>
            ) : null}
        </div>
    );
}
