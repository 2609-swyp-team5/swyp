"use client";

import { useInfiniteQuery } from "@tanstack/react-query";

import { dataSource } from "@/common/lib/api/dataSource";
import { interestApi } from "@/features/interest/api/interestApi";
import { getInterestsMock } from "@/features/interest/api/interestMockApi";

export const interestsQueryKey = ["interests", dataSource] as const;

const pageSize = 20;

export function useInterestsQuery() {
    return useInfiniteQuery({
        queryKey: interestsQueryKey,
        initialPageParam: undefined as string | undefined,
        queryFn: async ({ pageParam }) => {
            const response =
                dataSource === "api"
                    ? (await interestApi.getInterests({ cursor: pageParam, size: pageSize })).data
                    : await getInterestsMock();
            if (!response.success) {
                throw new Error(response.message);
            }
            return response.data;
        },
        getNextPageParam: (lastPage) =>
            lastPage.hasNext ? (lastPage.nextCursor ?? undefined) : undefined,
        staleTime: 60 * 1000,
        refetchOnWindowFocus: false,
        retry: false,
    });
}
