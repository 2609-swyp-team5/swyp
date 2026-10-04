"use client";

import { useInfiniteQuery } from "@tanstack/react-query";

import { useAuthStore } from "@/features/auth/store/authStore";
import { searchApi } from "@/features/search/api/searchApi";
import type { SearchParams } from "@/features/search/types";

const pageSize = 20;

export function useSearchQuery(params: SearchParams, staleTime = 0, enabled = true) {
    const isInitialized = useAuthStore((state) => state.isInitialized);

    return useInfiniteQuery({
        queryKey: ["search", params],
        queryFn: async ({ pageParam, signal }) => {
            const { data } = await searchApi.searchList(
                {
                    ...params,
                    cursor: pageParam ?? undefined,
                    size: pageSize,
                },
                signal,
            );
            if (!data.success) throw new Error(data.message);
            return data.data;
        },
        initialPageParam: null as string | null,
        getNextPageParam: (lastPage) =>
            lastPage.hasNext ? (lastPage.nextCursor ?? undefined) : undefined,
        enabled: isInitialized && enabled,
        staleTime,
        retry: false,
    });
}
