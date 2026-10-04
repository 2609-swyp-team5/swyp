"use client";

import { useQuery } from "@tanstack/react-query";

import { useAuthStore } from "@/features/auth/store/authStore";
import { homeApi } from "../../api/homeApi";
import { popularProductsResponseSchema } from "../../schemas/homeResponseSchema";

export function usePopularProductsQuery() {
    const isInitialized = useAuthStore((state) => state.isInitialized);

    return useQuery({
        queryKey: ["home", "popular-products"],
        queryFn: async ({ signal }) => {
            const { data } = await homeApi.popularProducts(signal);
            if (!data.success) throw new Error(data.message);
            return popularProductsResponseSchema.parse(data.data);
        },
        enabled: isInitialized,
        retry: false,
    });
}
