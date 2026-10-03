"use client";

import { getApiErrorMessage } from "@/common/lib/api/error";
import type { ProductStatus } from "@/features/sell/types";
import type { AnalysisRecommendation } from "../types";
import { useProductManagementSectionsQuery } from "../hooks/useProductManagementSectionsQuery";
import { MarketAnalysisSection } from "./analysis/market-analysis/MarketAnalysisSection";
import { ProductCompetitionSection } from "./competition/ProductCompetitionSection";
import { ProductSummaryCard } from "./product-summary/ProductSummaryCard";
import { ProductSummarySkeleton } from "./product-summary/ProductSummarySkeleton";

export function ProductManagementDetail({
    productId,
    initialStatus,
    initialRecommendation,
}: {
    productId: number;
    initialStatus?: ProductStatus;
    initialRecommendation?: AnalysisRecommendation;
}) {
    const sections = useProductManagementSectionsQuery(productId, {
        mockRecommendation: initialRecommendation,
    });
    const { data: summaryResult, error, isPending } = sections.productSummary;
    const data = summaryResult;
    const currentStatus = data?.status ?? (isPending ? initialStatus : undefined);
    const shouldShowCompetition = currentStatus !== undefined;

    return (
        <div className="flex min-w-0 flex-col gap-6">
            {isPending ? <ProductSummarySkeleton /> : null}
            {!isPending && error ? (
                <section className="flex min-h-[430px] items-center justify-center rounded-[16px] border border-[#dee5ed] bg-white p-6 text-center">
                    <p className="text-[14px] leading-6 font-medium text-[#d65353]">
                        {getApiErrorMessage(error)}
                    </p>
                </section>
            ) : null}
            {!isPending && !error && data ? <ProductSummaryCard product={data} /> : null}
            <MarketAnalysisSection
                result={sections.productAnalysis.data}
                error={sections.productAnalysis.error}
                isPending={sections.productAnalysis.isPending}
                priceTrendQuery={sections.productPriceTrend}
                valuationForecastQuery={sections.productValuationForecast}
            />
            {shouldShowCompetition ? (
                <ProductCompetitionSection query={sections.productCompetition} />
            ) : null}
        </div>
    );
}
