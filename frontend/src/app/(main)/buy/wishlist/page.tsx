"use client";

import { getApiErrorMessage } from "@/common/lib/api/error";
import {
    ManagementShell,
    type ManagementTab,
} from "@/features/product-management/components/ManagementShell";
import { useInterestsQuery } from "@/features/interest/hooks/queries/useInterestsQuery";

const statusMetaLabels: Record<string, string> = {
    DRAFT: "임시저장 상품",
    ON_SALE: "판매중인 상품",
    SOLD_OUT: "판매완료 상품",
};

const tabs: ManagementTab[] = [
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
        filter: (item) => item.metaLabel === statusMetaLabels.SOLD_OUT,
    },
];

export default function WishlistPage() {
    const { data, error, isPending } = useInterestsQuery();
    const interests = data ?? [];

    return (
        <ManagementShell
            eyebrow="AI가 가격변화를 추적하고 있어요"
            title="관심 상품"
            tabs={tabs}
            items={interests.map((interest) => ({
                id: String(interest.interestId),
                title: interest.title,
                price: interest.price,
                categoryName: interest.categoryName,
                thumbnailUrl: interest.thumbnailUrl,
                badgeLabel: interest.recommendation,
                badgeTone:
                    interest.recommendation === "BUY"
                        ? "primary"
                        : interest.recommendation === "WAIT"
                          ? "dark"
                          : "muted",
                metaLabel:
                    statusMetaLabels[interest.status] ?? interest.platformName ?? interest.status,
            }))}
            isLoading={isPending}
            errorMessage={error ? getApiErrorMessage(error) : undefined}
            emptyMessage="관심상품이 없습니다. 상품을 검색해 관심상품으로 등록해 보세요."
            listTitle="전체 상품 목록"
            primaryAction={{ label: "상품 검색하기", href: "/search" }}
        />
    );
}
