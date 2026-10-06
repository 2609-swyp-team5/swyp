"use client";

import { getApiErrorMessage } from "@/common/lib/api/error";
import type { ProductStatus } from "@/features/sell/types";
import type { AnalysisRecommendation } from "../types";
import { useProductManagementSectionsQuery } from "../hooks/useProductManagementSectionsQuery";
import { MarketAnalysisSection } from "./analysis/market-analysis/MarketAnalysisSection";
import { ProductCompetitionSection } from "./competition/ProductCompetitionSection";
import { ProductSummaryCard } from "./product-summary/ProductSummaryCard";
import { ProductSummarySkeleton } from "./product-summary/ProductSummarySkeleton";
import { SellerTargetPriceSection } from "./target-price/SellerTargetPriceSection";

export function ProductManagementDetail({
    productId,
    initialStatus,
    initialRecommendation,
}: {
    productId: number;
    initialStatus?: ProductStatus;
    initialRecommendation?: AnalysisRecommendation;
}) {
    // 판매 관리에서는 추천 상태·사유와 판매 현황만 보여주므로 가격 변화 추이·감가 상각률은 조회하지 않는다
    const sections = useProductManagementSectionsQuery(productId, {
        mockRecommendation: initialRecommendation,
        chartsEnabled: false,
    });
    const { data: summaryResult, error, isPending } = sections.productSummary;
    const data = summaryResult;
    const currentStatus = data?.status ?? (isPending ? initialStatus : undefined);
    const shouldShowCompetition = currentStatus !== undefined;
    const saleStats = {
        salesDurationDays: data?.daysOnSale ?? 0,
        viewCount: data?.viewCount ?? 0,
        interestCount: data?.interestCount ?? 0,
    };

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
            {currentStatus !== undefined && currentStatus !== "SOLD_OUT" ? (
                <SellerTargetPriceSection productId={productId} />
            ) : null}
            <MarketAnalysisSection
                result={sections.productAnalysis.data}
                error={sections.productAnalysis.error}
                isPending={sections.productAnalysis.isPending}
                priceTrendQuery={sections.productPriceTrend}
                valuationForecastQuery={sections.productValuationForecast}
                sellerSaleStats={saleStats}
            />
            {shouldShowCompetition ? (
                <ProductCompetitionSection query={sections.productCompetition} />
            ) : null}
        </div>
    );
}
