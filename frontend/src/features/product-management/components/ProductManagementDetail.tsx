"use client";

import { getApiErrorMessage } from "@/common/lib/api/error";
import { useProductQuery } from "@/features/sell/hooks/queries/useProductQuery";
import { useProductManagementSectionsQuery } from "../hooks/useProductManagementSectionsQuery";
import { MarketAnalysisSection } from "./analysis/market-analysis/MarketAnalysisSection";
import { ProductPriceTrendSection } from "./analysis/price-trend/ProductPriceTrendSection";
import { ProductTradeHistorySection } from "./analysis/trade-history/ProductTradeHistorySection";
import { ProductValuationForecastSection } from "./analysis/valuation-forecast/ProductValuationForecastSection";
import { ProductCompetitionSection } from "./competition/ProductCompetitionSection";
import { ProductSummaryCard } from "./product-summary/ProductSummaryCard";
import { ProductSummarySkeleton } from "./product-summary/ProductSummarySkeleton";

export function ProductManagementDetail({ productId }: { productId: number }) {
    const { data, error, isPending } = useProductQuery(productId);
    const sections = useProductManagementSectionsQuery(productId);

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
                result={sections.section2.data}
                error={sections.section2.error}
                isPending={sections.section2.isPending}
            />
            <ProductPriceTrendSection query={sections.section3} />
            <ProductValuationForecastSection query={sections.section4} />
            <ProductTradeHistorySection query={sections.section5} />
            <ProductCompetitionSection query={sections.section6} />
        </div>
    );
}
