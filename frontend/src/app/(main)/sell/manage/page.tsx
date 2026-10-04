"use client";

import { useCallback, useState } from "react";

import { getApiErrorMessage } from "@/common/lib/api/error";
import { ProductListShell } from "@/features/product-management/components/product-list/ProductListShell";
import type { ProductListTab } from "@/features/product-management/components/product-list/productListTypes";
import { ProductManagementDetail } from "@/features/product-management/components/ProductManagementDetail";
import type { AnalysisRecommendation } from "@/features/product-management/types";
import { useMyProductsQuery } from "@/features/sell/hooks/queries/useMyProductsQuery";
import type { ProductStatus } from "@/features/sell/types";

const statusMetaLabels: Record<ProductStatus, string> = {
    DRAFT: "임시저장 상품",
    ON_SALE: "판매 중인 상품",
    SOLD_OUT: "판매 완료 상품",
};

const analysisRecommendations: AnalysisRecommendation[] = ["SELL", "HOLD", "BUY", "WAIT"];

const tabs: ProductListTab[] = [
    {
        key: "ALL",
        label: "전체",
        listTitle: "전체 상품 목록",
        countKey: "total",
        filter: () => true,
    },
    {
        key: "DRAFT",
        label: "임시저장",
        listTitle: "임시저장 목록",
        countKey: "DRAFT",
        filter: (item) => item.metaLabel === statusMetaLabels.DRAFT,
    },
    {
        key: "ON_SALE",
        label: "판매 중",
        listTitle: "판매 중 목록",
        countKey: "ON_SALE",
        filter: (item) => item.metaLabel === statusMetaLabels.ON_SALE,
    },
    {
        key: "SOLD_OUT",
        label: "판매 완료",
        listTitle: "판매 완료 목록",
        countKey: "SOLD_OUT",
        filter: (item) => item.metaLabel === statusMetaLabels.SOLD_OUT,
    },
];

export default function SellManagePage() {
    const [activeTabKey, setActiveTabKey] = useState("ALL");
    const summaryQuery = useMyProductsQuery();
    const listQuery = useMyProductsQuery(
        activeTabKey === "ALL" ? undefined : (activeTabKey as ProductStatus),
    );
    const {
        data,
        error,
        isPending,
        hasNextPage,
        isFetchingNextPage,
        isFetchNextPageError,
        fetchNextPage,
    } = listQuery;
    const products = data?.pages.flatMap((page) => page.content) ?? [];
    const summaryFirstPage = summaryQuery.data?.pages[0];
    const loadMore = useCallback(() => {
        void fetchNextPage();
    }, [fetchNextPage]);

    return (
        <ProductListShell
            eyebrow="등록한 상품을 한눈에"
            title="판매 상품 관리"
            tabs={tabs}
            activeTabKey={activeTabKey}
            onTabChange={setActiveTabKey}
            items={products.map((product) => ({
                id: String(product.id),
                title: product.title,
                price: product.price,
                categoryName: product.categoryName,
                thumbnailUrl: product.thumbnailUrl,
                badgeLabel: product.recommendation,
                badgeTone:
                    product.recommendation === "SELL"
                        ? "primary"
                        : product.recommendation === "HOLD"
                          ? "dark"
                          : "muted",
                metaLabel: statusMetaLabels[product.status],
                status: product.status,
            }))}
            totalCount={summaryFirstPage?.totalCount}
            statusCounts={summaryFirstPage?.statusCounts}
            isLoading={isPending}
            errorMessage={error ? getApiErrorMessage(error) : undefined}
            hasNextPage={hasNextPage}
            isFetchingNextPage={isFetchingNextPage}
            isFetchNextPageError={isFetchNextPageError}
            onLoadMore={loadMore}
            onRetryLoadMore={loadMore}
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
