"use client";

import { getApiErrorMessage } from "@/common/lib/api/error";
import { ProductListShell } from "@/features/product-management/components/product-list/ProductListShell";
import type { ProductListTab } from "@/features/product-management/components/product-list/productListTypes";
import { useInterestsQuery } from "@/features/interest/hooks/queries/useInterestsQuery";
import { InterestProductDetail } from "@/features/interest/components/InterestProductDetail";
import { getInterestDisplayStatus } from "@/features/interest/utils/interestStatus";

const statusMetaLabels: Record<string, string> = {
    DRAFT: "임시저장 상품",
    ON_SALE: "판매중인 상품",
};
const soldOutLabel = "판매종료";

const tabs: ProductListTab[] = [
    { key: "all", label: "전체", listTitle: "전체 상품 목록", filter: () => true },
    {
        key: "buy",
        label: "구매추천",
        listTitle: "구매추천 목록",
        filter: (item) => item.badgeLabel === "BUY",
    },
    {
        key: "wait",
        label: "관찰중",
        listTitle: "관찰중 목록",
        filter: (item) => item.badgeLabel === "WAIT",
    },
    {
        key: "sold-out",
        label: "판매종료",
        listTitle: "판매종료 목록",
        filter: (item) => item.metaLabel === soldOutLabel,
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

                return {
                    id: String(interest.interestId),
                    title: interest.title,
                    price: interest.price,
                    categoryName: interest.categoryName,
                    thumbnailUrl: interest.thumbnailUrl,
                    badgeLabel: displayStatus === "SOLD_OUT" ? null : displayStatus,
                    badgeTone: displayStatus === "BUY" ? "primary" : "dark",
                    metaLabel:
                        displayStatus === "SOLD_OUT"
                            ? soldOutLabel
                            : interest.source === "EXTERNAL"
                              ? (interest.platformName ?? interest.status)
                              : (statusMetaLabels[interest.status] ?? interest.status),
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
