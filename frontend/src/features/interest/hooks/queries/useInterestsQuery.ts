"use client";

import { useQuery } from "@tanstack/react-query";

import { dataSource } from "@/common/lib/api/dataSource";
import { interestApi } from "@/features/interest/api/interestApi";
import { getInterestsMock } from "@/features/interest/api/interestMockApi";

export const interestsQueryKey = ["interests", dataSource] as const;

export function useInterestsQuery() {
    return useQuery({
        queryKey: interestsQueryKey,
        queryFn: async () => {
            const response =
                dataSource === "api"
                    ? (await interestApi.getInterests()).data
                    : await getInterestsMock();
            if (!response.success) {
                throw new Error(response.message);
            }
            return response.data.content;
        },
        staleTime: 60 * 1000,
        refetchOnWindowFocus: false,
        retry: false,
    });
}
