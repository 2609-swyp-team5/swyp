"use client";

import { useQuery } from "@tanstack/react-query";

import { interestApi } from "@/features/interest/api/interestApi";

export const interestsQueryKey = ["interests"] as const;

export function useInterestsQuery() {
    return useQuery({
        queryKey: interestsQueryKey,
        queryFn: async () => {
            const { data } = await interestApi.getInterests();
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
