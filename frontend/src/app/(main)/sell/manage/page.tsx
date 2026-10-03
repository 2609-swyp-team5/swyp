"use client";

import { getApiErrorMessage } from "@/common/lib/api/error";
import { ProductListShell } from "@/features/product-management/components/product-list/ProductListShell";
import type { ProductListTab } from "@/features/product-management/components/product-list/productListTypes";
import { ProductManagementDetail } from "@/features/product-management/components/ProductManagementDetail";
import type { AnalysisRecommendation } from "@/features/product-management/types";
import { useMyProductsQuery } from "@/features/sell/hooks/queries/useMyProductsQuery";
import type { ProductStatus } from "@/features/sell/types";

const statusMetaLabels: Record<ProductStatus, string> = {
    DRAFT: "임시저장 상품",
    ON_SALE: "판매중인 상품",
    SOLD_OUT: "판매완료 상품",
};

const recommendationLabels: Record<string, string> = {
    SELL: "SELL",
    HOLD: "HOLD",
};
const analysisRecommendations: AnalysisRecommendation[] = ["SELL", "HOLD", "BUY", "WAIT"];

const tabs: ProductListTab[] = [
    { key: "all", label: "전체", listTitle: "전체 상품 목록", filter: () => true },
    {
        key: "draft",
        label: "임시저장",
        listTitle: "임시저장 목록",
        filter: (item) => item.metaLabel === statusMetaLabels.DRAFT,
    },
    {
        key: "on-sale",
        label: "판매중",
        listTitle: "판매중 목록",
        filter: (item) => item.metaLabel === statusMetaLabels.ON_SALE,
    },
    {
        key: "sold-out",
        label: "판매완료",
        listTitle: "판매완료 목록",
        filter: (item) => item.metaLabel === statusMetaLabels.SOLD_OUT,
    },
];

export default function SellManagePage() {
    const { data, error, isPending } = useMyProductsQuery();
    const products = data?.content ?? [];

    return (
        <ProductListShell
            eyebrow="등록한 상품을 한눈에"
            title="판매 상품 관리"
            tabs={tabs}
            items={products.map((product) => ({
                id: String(product.id),
                title: product.title,
                price: product.price,
                categoryName: product.categoryName,
                thumbnailUrl: product.thumbnailUrl,
                badgeLabel: product.recommendation
                    ? (recommendationLabels[product.recommendation] ?? product.recommendation)
                    : null,
                badgeTone:
                    product.recommendation === "SELL"
                        ? "primary"
                        : product.recommendation === "HOLD"
                          ? "dark"
                          : "muted",
                metaLabel: statusMetaLabels[product.status],
                status: product.status,
            }))}
            isLoading={isPending}
            errorMessage={error ? getApiErrorMessage(error) : undefined}
            emptyMessage="등록된 상품이 없습니다."
            listTitle="전체 상품 목록"
            detailRenderer={(item) => {
                const product = products.find((candidate) => String(candidate.id) === item.id);
                const initialRecommendation = analysisRecommendations.includes(
                    product?.recommendation as AnalysisRecommendation,
                )
                    ? (product?.recommendation as AnalysisRecommendation)
                    : undefined;

                return (
                    <ProductManagementDetail
                        productId={Number(item.id)}
                        initialStatus={item.status}
                        initialRecommendation={initialRecommendation}
                    />
                );
            }}
            primaryAction={{ label: "상품 등록하기", href: "/sell/register" }}
        />
    );
}
