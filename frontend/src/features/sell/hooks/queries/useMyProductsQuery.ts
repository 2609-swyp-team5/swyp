"use client";

import { useQuery } from "@tanstack/react-query";

import { dataSource } from "@/common/lib/api/dataSource";
import { productApi } from "@/features/sell/api/productApi";
import { getMyProductsMock } from "@/features/sell/mocks/productMock";
import { productSummaryPageResponseSchema } from "@/features/sell/schemas/productResponseSchema";
import type { ProductStatus } from "@/features/sell/types";

export const myProductsQueryKey = (status?: ProductStatus) =>
    ["my-products", dataSource, status] as const;

export function useMyProductsQuery(status?: ProductStatus) {
    return useQuery({
        queryKey: myProductsQueryKey(status),
        queryFn: async () => {
            if (dataSource === "mock") {
                return getMyProductsMock(status);
            }

            const { data } = await productApi.getMyProducts({ status });
            if (!data.success) {
                throw new Error(data.message);
            }
            return productSummaryPageResponseSchema.parse(data.data);
        },
        staleTime: 60 * 1000,
        refetchOnWindowFocus: false,
        retry: false,
    });
}
