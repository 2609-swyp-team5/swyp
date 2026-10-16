"use client";

import { useCallback, useState } from "react";

import { Button } from "@/common/components/ui/Button";
import { getApiErrorMessage } from "@/common/lib/api/error";
import { MyPageContent } from "@/features/my/components/MyPageContent";
import { ProductFilters } from "@/features/my/components/products/ProductFilters";
import { ProductTable } from "@/features/my/components/products/ProductTable";
import { useMyProductsQuery } from "@/features/my/hooks/queries/useMyProductsQuery";
import type { MyProductFilter } from "@/features/my/types";

export function MyProductsPage() {
    const [filter, setFilter] = useState<MyProductFilter>("ALL");
    const listQuery = useMyProductsQuery(filter === "ALL" ? undefined : filter);
    const {
        data,
        isPending,
        isError,
        error,
        refetch,
        hasNextPage,
        fetchNextPage,
        isFetchingNextPage,
        isFetchNextPageError,
        isFetching,
        isPlaceholderData,
    } = listQuery;
    const summary = data?.pages[0];
    const counts = summary?.statusCounts
        ? {
              ALL: Object.values(summary.statusCounts).reduce((sum, count) => sum + count, 0),
              DRAFT: summary.statusCounts.DRAFT ?? 0,
              ON_SALE: summary.statusCounts.ON_SALE ?? 0,
              RESERVED: summary.statusCounts.RESERVED ?? 0,
              SOLD_OUT: summary.statusCounts.SOLD_OUT ?? 0,
          }
        : undefined;
    const products = isPlaceholderData
        ? []
        : (data?.pages.flatMap((page) =>
              page.content.map((product) => ({ ...product, platformName: null })),
          ) ?? []);
    const loadMore = useCallback(() => {
        void fetchNextPage();
    }, [fetchNextPage]);

    return (
        <MyPageContent
            eyebrow="판매 관리"
            title="등록된 상품 확인"
            eyebrowClassName="typography-heading-03 font-semibold text-[#83889e]"
            titleClassName="text-[#1a1f35]"
        >
            <ProductFilters filter={filter} onFilterChange={setFilter} counts={counts} />
            <ProductTable
                products={products}
                isLoading={isPending || isPlaceholderData}
                isError={isError}
                isFetchingNextPage={isFetchingNextPage}
                hasNextPage={isPlaceholderData ? false : hasNextPage}
                isFetchNextPageError={isFetchNextPageError}
                onLoadMore={loadMore}
                onRetryLoadMore={loadMore}
            />
            {isError && !isFetchNextPageError && (
                <div className="mt-4 flex flex-col items-start gap-4">
                    <p role="alert" className="text-[#fa503d]">
                        {getApiErrorMessage(error)}
                    </p>
                    <Button
                        type="button"
                        variant="outline"
                        disabled={isFetching}
                        onClick={() => void (isFetchNextPageError ? fetchNextPage() : refetch())}
                    >
                        다시 시도
                    </Button>
                </div>
            )}
        </MyPageContent>
    );
}
