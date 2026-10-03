"use client";

import { useQuery } from "@tanstack/react-query";

import { getInterestsMock } from "@/features/interest/api/interestMockApi";

export const interestsQueryKey = ["interests"] as const;

export function useInterestsQuery() {
    return useQuery({
        queryKey: interestsQueryKey,
        queryFn: async () => {
            const response = await getInterestsMock();
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
