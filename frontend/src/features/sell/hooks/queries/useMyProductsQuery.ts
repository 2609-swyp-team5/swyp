"use client";

import { useQuery } from "@tanstack/react-query";

import { productApi } from "@/features/sell/api/productApi";
import type { ProductStatus } from "@/features/sell/types";

export const myProductsQueryKey = (status?: ProductStatus) => ["my-products", status] as const;

export function useMyProductsQuery(status?: ProductStatus) {
    return useQuery({
        queryKey: myProductsQueryKey(status),
        queryFn: async () => {
            const { data } = await productApi.getMyProducts({ status });
            if (!data.success) {
                throw new Error(data.message);
            }
            return data.data;
        },
        staleTime: 60 * 1000,
        refetchOnWindowFocus: false,
        retry: false,
    });
}
