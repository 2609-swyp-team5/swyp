"use client";

import { useQuery } from "@tanstack/react-query";

import { categoryApi } from "@/features/sell/api/categoryApi";

export const categoriesQueryKey = ["categories"] as const;

export function useCategoriesQuery() {
    return useQuery({
        queryKey: categoriesQueryKey,
        queryFn: async () => {
            const { data } = await categoryApi.getCategories();
            if (!data.success) {
                throw new Error(data.message);
            }
            return data.data;
        },
        staleTime: 10 * 60 * 1000,
        retry: 1,
    });
}
