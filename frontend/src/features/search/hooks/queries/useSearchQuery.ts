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
        // 같은 검색어에서 정렬·필터만 바뀌면 새 결과가 올 때까지 이전 결과를 유지한다(새 검색어는 스켈레톤부터)
        placeholderData: (previousData, previousQuery) =>
            (previousQuery?.queryKey[1] as SearchParams | undefined)?.keyword === params.keyword
                ? previousData
                : undefined,
        enabled: isInitialized && enabled,
        staleTime,
        retry: false,
    });
}
