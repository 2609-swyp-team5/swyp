"use client";

import { useQuery } from "@tanstack/react-query";
import { searchApi } from "@/features/search/api/searchApi";
import { useAuthStore } from "@/features/auth/store/authStore";

export function useSearchProductDetailQuery(id: number) {
    const isInitialized = useAuthStore((state) => state.isInitialized);
    return useQuery({
        queryKey: ["search-product-detail", id],
        queryFn: async ({ signal }) => {
            const { data } = await searchApi.searchProductDetail(id, signal);
            if (!data.success) throw new Error(data.message);
            return data.data;
        },
        enabled: isInitialized,
        retry: false,
    });
}
