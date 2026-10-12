"use client";

import { useState } from "react";

import { getApiErrorMessage } from "@/common/lib/api/error";
import type { ProductStatus } from "@/features/sell/types";
import { useProductManagementOverviewQuery } from "../hooks/useProductManagementOverviewQuery";
import { useProductManagementSectionsQuery } from "../hooks/useProductManagementSectionsQuery";
import { MarketAnalysisSection } from "./analysis/market-analysis/MarketAnalysisSection";
import { ProductSummaryCard } from "./product-summary/ProductSummaryCard";
import { ProductSummarySkeleton } from "./product-summary/ProductSummarySkeleton";
import { SoldProductSummaryCard } from "./product-summary/SoldProductSummaryCard";
import { SoldProductSummarySkeleton } from "./product-summary/SoldProductSummarySkeleton";
import { SellerTargetPriceSection } from "./target-price/SellerTargetPriceSection";
import { canSetSellerTargetPrice } from "./target-price/targetPriceAvailability";

export function ProductManagementDetail({
    productId,
    initialStatus,
}: {
    productId: number;
    initialStatus?: ProductStatus;
}) {
    const [showSoldDetails, setShowSoldDetails] = useState(initialStatus !== "SOLD_OUT");
    const [showAnalysisDetails, setShowAnalysisDetails] = useState(false);

    const isSoldOverviewMode = initialStatus === "SOLD_OUT" && !showSoldDetails;
    const shouldLoadDetailSections = !isSoldOverviewMode;
    const overview = useProductManagementOverviewQuery(productId, {
        enabled: isSoldOverviewMode,
    });
    const sections = useProductManagementSectionsQuery(productId, {
        summaryEnabled: !isSoldOverviewMode,
        analysisEnabled: shouldLoadDetailSections,
        analysisDetailsEnabled: shouldLoadDetailSections && showAnalysisDetails,
        competitionEnabled: shouldLoadDetailSections && showAnalysisDetails,
    });
    const activeSummaryQuery = isSoldOverviewMode ? overview : sections.productSummary;
    const { data, error, isPending } = activeSummaryQuery;
    const currentStatus = data?.status ?? (isPending ? initialStatus : undefined);

    return (
        <div className="flex w-full min-w-0 flex-col gap-6">
            {isPending ? (
                initialStatus === "SOLD_OUT" ? (
                    <SoldProductSummarySkeleton />
                ) : (
                    <ProductSummarySkeleton />
                )
            ) : null}
            {!isPending && error ? (
                <section className="flex min-h-[430px] items-center justify-center rounded-[16px] border border-[#dee5ed] bg-white p-6 text-center">
                    <p className="text-[14px] leading-6 font-medium text-[#d65353]">
                        {getApiErrorMessage(error)}
                    </p>
                </section>
            ) : null}
            {!isPending && !error && data ? (
                currentStatus === "SOLD_OUT" ? (
                    <SoldProductSummaryCard
                        product={data}
                        onDetailsClick={() => setShowSoldDetails(true)}
                    />
                ) : sections.productSummary.data ? (
                    <ProductSummaryCard product={sections.productSummary.data} />
                ) : null
            ) : null}
            {currentStatus !== undefined && canSetSellerTargetPrice(currentStatus) ? (
                <SellerTargetPriceSection productId={productId} />
            ) : null}
            {currentStatus === "SOLD_OUT" && showSoldDetails && sections.productSummary.data ? (
                <ProductSummaryCard product={sections.productSummary.data} />
            ) : null}
            {shouldLoadDetailSections ? (
                <>
                    <MarketAnalysisSection
                        result={sections.productAnalysis.data}
                        error={sections.productAnalysis.error}
                        isPending={sections.productAnalysis.isPending}
                        competitionQuery={sections.productCompetition}
                        priceTrendQuery={sections.productPriceTrend}
                        valuationForecastQuery={sections.productValuationForecast}
                        variant="management"
                        isDetailsOpen={showAnalysisDetails}
                        onDetailsOpenChange={setShowAnalysisDetails}
                        analysisRetry={{
                            isFetching: sections.productAnalysis.isFetching,
                            refetch: sections.productAnalysis.refetch,
                        }}
                    />
                </>
            ) : null}
        </div>
    );
}
