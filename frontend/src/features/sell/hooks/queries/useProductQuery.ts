"use client";

import { useQuery } from "@tanstack/react-query";

import { productApi } from "@/features/sell/api/productApi";

export const productQueryKey = (id: number) => ["product", id] as const;

export function useProductQuery(id: number) {
    return useQuery({
        queryKey: productQueryKey(id),
        queryFn: () => productApi.getProduct(id),
        enabled: Number.isInteger(id) && id > 0,
        refetchOnWindowFocus: false,
        retry: false,
    });
}
