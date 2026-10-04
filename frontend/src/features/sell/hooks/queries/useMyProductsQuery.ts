"use client";

import { keepPreviousData, useInfiniteQuery } from "@tanstack/react-query";

import { dataSource } from "@/common/lib/api/dataSource";
import { productApi } from "@/features/sell/api/productApi";
import { getMyProductsMock } from "@/features/sell/mocks/productMock";
import { productSummaryPageResponseSchema } from "@/features/sell/schemas/productResponseSchema";
import type { ProductStatus } from "@/features/sell/types";

const pageSize = 20;

export const myProductsQueryKey = (status?: ProductStatus) =>
    ["my-products", dataSource, status] as const;

export function useMyProductsQuery(status?: ProductStatus) {
    return useInfiniteQuery({
        queryKey: myProductsQueryKey(status),
        initialPageParam: undefined as string | undefined,
        placeholderData: keepPreviousData,
        queryFn: async ({ pageParam }) => {
            if (dataSource === "mock") {
                return getMyProductsMock(status);
            }

            const { data } = await productApi.getMyProducts({
                status,
                cursor: pageParam,
                size: pageSize,
            });
            if (!data.success) {
                throw new Error(data.message);
            }
            return productSummaryPageResponseSchema.parse(data.data);
        },
        getNextPageParam: (lastPage) =>
            lastPage.hasNext ? (lastPage.nextCursor ?? undefined) : undefined,
        staleTime: 60 * 1000,
        refetchOnWindowFocus: false,
        retry: false,
    });
}
