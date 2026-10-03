"use client";

import { getApiErrorMessage } from "@/common/lib/api/error";
import { ProductListShell } from "@/features/product-management/components/product-list/ProductListShell";
import type { ProductListTab } from "@/features/product-management/components/product-list/productListTypes";
import { useInterestsQuery } from "@/features/interest/hooks/queries/useInterestsQuery";
import { InterestProductDetail } from "@/features/interest/components/InterestProductDetail";
import { getInterestDisplayStatus } from "@/features/interest/utils/interestStatus";

const displayStatusMetaLabels = {
    BUY: "구매추천 상품",
    WAIT: "관찰중인 상품",
    SOLD_OUT: "판매종료 상품",
} as const;

const tabs: ProductListTab[] = [
    { key: "all", label: "전체", listTitle: "전체 상품 목록", filter: () => true },
    {
        key: "buy",
        label: "구매추천",
        listTitle: "구매추천 목록",
        filter: (item) =>
            item.badgeLabel === "BUY" && item.metaLabel !== displayStatusMetaLabels.SOLD_OUT,
    },
    {
        key: "wait",
        label: "관찰중",
        listTitle: "관찰중 목록",
        filter: (item) =>
            item.badgeLabel === "WAIT" && item.metaLabel !== displayStatusMetaLabels.SOLD_OUT,
    },
    {
        key: "sold-out",
        label: "판매종료",
        listTitle: "판매종료 목록",
        filter: (item) => item.metaLabel === displayStatusMetaLabels.SOLD_OUT,
    },
];

export default function WishlistPage() {
    const { data, error, isPending } = useInterestsQuery();
    const interests = data ?? [];

    return (
        <ProductListShell
            eyebrow="AI가 가격변화를 추적하고 있어요"
            title="관심 상품"
            tabs={tabs}
            items={interests.map((interest) => {
                const displayStatus = getInterestDisplayStatus(interest);
                const recommendationBadge = interest.recommendation === "BUY" ? "BUY" : "WAIT";

                return {
                    id: String(interest.interestId),
                    title: interest.title,
                    price: interest.price,
                    categoryName: interest.categoryName,
                    thumbnailUrl: interest.thumbnailUrl,
                    badgeLabel: recommendationBadge,
                    badgeTone: recommendationBadge === "BUY" ? "primary" : "dark",
                    metaLabel: displayStatusMetaLabels[displayStatus],
                };
            })}
            isLoading={isPending}
            errorMessage={error ? getApiErrorMessage(error) : undefined}
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
