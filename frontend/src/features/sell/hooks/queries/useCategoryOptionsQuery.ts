"use client";

import { useQuery } from "@tanstack/react-query";

import { categoryApi } from "@/features/sell/api/categoryApi";

export const categoryOptionsQueryKey = (categoryId: number | null) =>
    ["categories", categoryId, "options"] as const;

/** 최하위 카테고리의 추가 항목. 카테고리를 끝까지 고르기 전(null)에는 요청하지 않는다. */
export function useCategoryOptionsQuery(categoryId: number | null) {
    return useQuery({
        queryKey: categoryOptionsQueryKey(categoryId),
        queryFn: async () => {
            const { data } = await categoryApi.getCategoryOptions(categoryId as number);
            if (!data.success) {
                throw new Error(data.message);
            }
            return data.data;
        },
        enabled: categoryId !== null,
        staleTime: 60 * 60 * 1000,
        retry: 1,
    });
}
