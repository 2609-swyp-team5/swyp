"use client";

import { useCallback, useState } from "react";

import { getApiErrorMessage } from "@/common/lib/api/error";
import { ProductListShell } from "@/features/product-management/components/product-list/ProductListShell";
import type { ProductListTab } from "@/features/product-management/components/product-list/productListTypes";
import { useInterestsQuery } from "@/features/interest/hooks/queries/useInterestsQuery";
import { InterestProductDetail } from "@/features/interest/components/InterestProductDetail";
import type { InterestStatus } from "@/features/interest/types";

const displayStatusMetaLabels = {
    BUY: "구매 추천 상품",
    WAIT: "구매 대기 상품",
    SOLD_OUT: "판매 종료 상품",
    PENDING: "분석 대기 상품",
} as const;

const tabs: ProductListTab[] = [
    {
        key: "ALL",
        label: "전체",
        listTitle: "전체 상품 목록",
        countKey: "total",
        filter: () => true,
    },
    {
        key: "PENDING",
        label: "분석 대기",
        listTitle: "분석 대기 목록",
        countKey: "PENDING",
        filter: (item) => item.badgeLabel === "PENDING",
    },
    {
        key: "BUY",
        label: "구매 추천",
        listTitle: "구매 추천 목록",
        countKey: "BUY",
        filter: (item) =>
            item.badgeLabel === "BUY" && item.metaLabel !== displayStatusMetaLabels.SOLD_OUT,
    },
    {
        key: "WAIT",
        label: "구매 대기",
        listTitle: "구매 대기 목록",
        countKey: "WAIT",
        filter: (item) =>
            item.badgeLabel === "WAIT" && item.metaLabel !== displayStatusMetaLabels.SOLD_OUT,
    },
    {
        key: "SOLD_OUT",
        label: "판매 종료",
        listTitle: "판매 종료 목록",
        countKey: "SOLD_OUT",
        filter: (item) => item.metaLabel === displayStatusMetaLabels.SOLD_OUT,
    },
];

export default function WishlistPage() {
    const [activeTabKey, setActiveTabKey] = useState("ALL");
    const listQuery = useInterestsQuery(
        activeTabKey === "ALL" ? undefined : (activeTabKey as InterestStatus),
    );
    const {
        data,
        error,
        isPending,
        hasNextPage,
        isFetchingNextPage,
        isFetchNextPageError,
        fetchNextPage,
        isPlaceholderData,
    } = listQuery;
    const interests = isPlaceholderData ? [] : (data?.pages.flatMap((page) => page.content) ?? []);
    const firstPage = data?.pages[0];
    const loadMore = useCallback(() => {
        void fetchNextPage();
    }, [fetchNextPage]);

    return (
        <ProductListShell
            eyebrow="AI가 가격변화를 추적하고 있어요"
            title="관심 상품"
            tabs={tabs}
            activeTabKey={activeTabKey}
            onTabChange={setActiveTabKey}
            items={interests.map((interest) => {
                const displayStatus = interest.interestStatus;
                const recommendationBadge =
                    displayStatus === "PENDING"
                        ? "PENDING"
                        : interest.recommendation === "BUY"
                          ? "BUY"
                          : "WAIT";

                return {
                    id: String(interest.interestId),
                    title: interest.title,
                    price: interest.price,
                    categoryName: interest.categoryName,
                    thumbnailUrl: interest.thumbnailUrl,
                    badgeLabel: recommendationBadge,
                    badgeTone:
                        recommendationBadge === "BUY"
                            ? "primary"
                            : recommendationBadge === "WAIT"
                              ? "dark"
                              : "muted",
                    metaLabel: displayStatusMetaLabels[displayStatus],
                };
            })}
            totalCount={firstPage?.totalCount}
            statusCounts={firstPage?.statusCounts}
            isLoading={isPending || isPlaceholderData}
            errorMessage={error ? getApiErrorMessage(error) : undefined}
            hasNextPage={isPlaceholderData ? false : hasNextPage}
            isFetchingNextPage={isFetchingNextPage}
            isFetchNextPageError={isFetchNextPageError}
            onLoadMore={loadMore}
            onRetryLoadMore={loadMore}
            emptyMessage="관심상품이 없습니다. 상품을 검색해 관심상품으로 등록해 보세요."
            listTitle="전체 상품 목록"
            detailRenderer={(item) => {
                const interest = interests.find(
                    (candidate) => String(candidate.interestId) === item.id,
                );

                return interest ? <InterestProductDetail interest={interest} /> : null;
            }}
            primaryAction={{ label: "상품 검색하기", href: "/search" }}
        />
    );
}
