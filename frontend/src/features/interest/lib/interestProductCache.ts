import { type InfiniteData, type QueryClient } from "@tanstack/react-query";

import type { InterestTarget } from "@/features/interest/types";
import type { ProductSummaryResponse } from "@/features/sell/types";
import type { SearchProductDetail, SearchResponse } from "@/features/search/types";

export type InterestCacheState = {
    favorite: boolean;
    interestId: number | null;
};

export type InterestCacheSnapshot = [readonly unknown[], unknown][];

const isSameTarget = (item: { source: string; id: number }, target: InterestTarget) =>
    item.source === target.source && item.id === target.targetId;

const isSameDetailTarget = (item: SearchProductDetail, target: InterestTarget) =>
    item.source === target.source && item.id === target.targetId;

export function snapshotInterestProductCaches(
    queryClient: QueryClient,
    target: InterestTarget,
): InterestCacheSnapshot {
    return [
        ...queryClient.getQueriesData<InfiniteData<SearchResponse>>({ queryKey: ["search"] }),
        ...queryClient.getQueriesData<SearchProductDetail>({
            queryKey: ["search-product-detail", target.targetId],
        }),
        ...queryClient.getQueriesData<ProductSummaryResponse[]>({
            queryKey: ["home", "popular-products"],
        }),
    ];
}

export function updateInterestProductCaches(
    queryClient: QueryClient,
    target: InterestTarget,
    state: InterestCacheState,
) {
    queryClient.setQueriesData<InfiniteData<SearchResponse>>(
        { queryKey: ["search"] },
        (current) => {
            if (!current) return current;
            return {
                ...current,
                pages: current.pages.map((page) => ({
                    ...page,
                    content: page.content.map((product) =>
                        isSameTarget(product, target) ? { ...product, ...state } : product,
                    ),
                })),
            };
        },
    );

    queryClient.setQueryData<SearchProductDetail | undefined>(
        ["search-product-detail", target.targetId],
        (current) =>
            current && isSameDetailTarget(current, target) ? { ...current, ...state } : current,
    );

    if (target.source === "OUR") {
        queryClient.setQueryData<ProductSummaryResponse[]>(
            ["home", "popular-products"],
            (current) =>
                current?.map((product) =>
                    product.id === target.targetId ? { ...product, ...state } : product,
                ),
        );
    }
}

export function restoreInterestProductCaches(
    queryClient: QueryClient,
    snapshots: InterestCacheSnapshot,
) {
    snapshots.forEach(([queryKey, data]) => {
        queryClient.setQueryData(queryKey, data);
    });
}
