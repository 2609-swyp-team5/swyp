"use client";

import { keepPreviousData, useInfiniteQuery } from "@tanstack/react-query";

import { dataSource } from "@/common/lib/api/dataSource";
import { interestApi } from "@/features/interest/api/interestApi";
import { getInterestsMock } from "@/features/interest/api/interestMockApi";
import type { InterestStatus } from "@/features/interest/types";
import { interestListResponseSchema } from "@/features/interest/schemas/interestResponseSchema";

export const interestsQueryKey = ["interests", dataSource] as const;

const pageSize = 20;

export function useInterestsQuery(status?: InterestStatus) {
    return useInfiniteQuery({
        queryKey: [...interestsQueryKey, status] as const,
        initialPageParam: undefined as string | undefined,
        placeholderData: keepPreviousData,
        queryFn: async ({ pageParam }) => {
            const response =
                dataSource === "api"
                    ? (
                          await interestApi.getInterests({
                              status,
                              cursor: pageParam,
                              size: pageSize,
                          })
                      ).data
                    : await getInterestsMock(status);
            if (!response.success) {
                throw new Error(response.message);
            }
            return interestListResponseSchema.parse(response.data);
        },
        getNextPageParam: (lastPage) =>
            lastPage.hasNext ? (lastPage.nextCursor ?? undefined) : undefined,
        staleTime: 60 * 1000,
        refetchOnWindowFocus: false,
        retry: false,
    });
}
