"use client";

import { useQuery } from "@tanstack/react-query";

import { useAuthStore } from "@/features/auth/store/authStore";
import { searchApi } from "@/features/search/api/searchApi";
import type { SearchParams } from "@/features/search/types";

export function useSearchQuery(params: SearchParams) {
    const isInitialized = useAuthStore((state) => state.isInitialized);
    const isLoggedIn = useAuthStore((state) => state.isLoggedIn);

    return useQuery({
        queryKey: ["search", "list", params],
        queryFn: async ({ signal }) => {
            const { data } = await searchApi.searchList(params, signal);
            if (!data.success) {
                throw new Error(data.message);
            }
            return data.data;
        },
        enabled: isInitialized && isLoggedIn,
        retry: false,
    });
}
