"use client";

import { dataSource } from "@/common/lib/api/dataSource";
import { getApiErrorMessage } from "@/common/lib/api/error";
import { clearSelectedProductId } from "@/features/product-management/hooks/useSelectedProductId";
import { useProductManagementSectionsQuery } from "@/features/product-management/hooks/useProductManagementSectionsQuery";
import { MarketAnalysisSection } from "@/features/product-management/components/analysis/market-analysis/MarketAnalysisSection";
import { ProductCompetitionSection } from "@/features/product-management/components/competition/ProductCompetitionSection";
import { ProductSummaryCard } from "@/features/product-management/components/product-summary/ProductSummaryCard";
import { ProductSummarySkeleton } from "@/features/product-management/components/product-summary/ProductSummarySkeleton";
import { TargetPriceCard } from "@/features/product-management/components/target-price/TargetPriceCard";
import { formatPrice } from "@/features/product-management/components/analysis/market-analysis/formatters";
import type { ProductDetailSummaryResponse } from "@/features/product-management/schemas/productManagementResponseSchema";
import type { ProductStatus } from "@/features/sell/types";
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
    const deleteMutation = useDeleteInterestMutation();
    const targetPriceMutation = useSetInterestTargetPriceMutation(interest.interestId);
    const { targetPrice, price } = interest;
    const sections = useProductManagementSectionsQuery(interest.targetId, {
        perspective: "BUY",
        summaryEnabled: dataSource === "api",
        buyerRecommendation:
            interest.interestStatus === "BUY" || interest.interestStatus === "WAIT"
                ? interest.interestStatus
                : undefined,
        chartsEnabled: false,
    });

    const handleDelete = () => {
        deleteMutation.mutate(interest.interestId, {
            onSuccess: clearSelectedProductId,
        });
    };

    const detailLabel =
        interest.source === "EXTERNAL"
            ? `${interest.platformName ?? "외부 플랫폼"} 매물`
            : (statusLabels[interest.status] ?? interest.status);

    const fallbackProductStatus: ProductStatus =
        interest.status === "DRAFT" ||
        interest.status === "ON_SALE" ||
        interest.status === "SOLD_OUT"
            ? interest.status
            : "ON_SALE";
    const mockSummaryProduct: ProductDetailSummaryResponse = {
        id: interest.targetId,
        status: fallbackProductStatus,
        createdAt: interest.createdAt,
        title: interest.title,
        price: interest.price,
        category: {
            id: 0,
            name: interest.categoryName,
            parentId: null,
        },
        condition: interest.condition ?? "A",
        imageUrls: interest.thumbnailUrl ? [interest.thumbnailUrl] : [],
        viewCount: null,
        interestCount: 0,
        daysOnSale: null,
        platforms:
            dataSource === "mock" && interest.source === "OUR" && interest.status === "ON_SALE"
                ? [
                      {
                          platform: "BUNJANG",
                          platformName: "번개장터",
                          status: "POSTED",
                          productUrl: `https://m.bunjang.co.kr/products/${interest.targetId}`,
                      },
                  ]
                : [],
    };
    const summaryProduct = dataSource === "api" ? sections.productSummary.data : mockSummaryProduct;

    return (
        <div className="flex min-w-0 flex-col gap-6">
            {dataSource === "api" && sections.productSummary.isPending ? (
                <ProductSummarySkeleton />
            ) : null}
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
                <p className="-mt-4 text-right text-[13px] leading-5 text-[#d65353]">
                    {getApiErrorMessage(deleteMutation.error)}
                </p>
            ) : null}
            {dataSource === "api" && sections.productSummary.error ? (
                <p className="-mt-4 text-right text-[13px] leading-5 text-[#d65353]">
                    {getApiErrorMessage(sections.productSummary.error)}
                </p>
            ) : null}

            <TargetPriceCard
                key={`${interest.interestId}-${targetPrice ?? "none"}`}
                title="목표 구매가"
                description="상품 가격이 이 금액 이하가 되면 알려드려요."
                targetPrice={targetPrice}
                compareLabel="현재 가격"
                comparePrice={price}
                reached={targetPrice !== null && price <= targetPrice}
                reachedText="현재 가격이 목표 구매가 이하예요."
                waitingText={
                    targetPrice === null
                        ? ""
                        : `목표 구매가까지 ${formatPrice(price - targetPrice)} 남았어요.`
                }
                isSaving={targetPriceMutation.isPending}
                error={targetPriceMutation.error}
                onSave={(value) => targetPriceMutation.mutate(value)}
            />

            <MarketAnalysisSection
                result={sections.productAnalysis.data}
                error={sections.productAnalysis.error}
                isPending={sections.productAnalysis.isPending}
                priceTrendQuery={sections.productPriceTrend}
                valuationForecastQuery={sections.productValuationForecast}
                summaryOnly
            />
            <ProductCompetitionSection
                query={sections.productCompetition}
                heading="비슷한 상품"
                showCompetitionMeta={false}
            />
        </div>
    );
}
