"use client";

import { useQuery } from "@tanstack/react-query";

import { useAuthStore } from "@/features/auth/store/authStore";
import { myApi } from "@/features/my/api/myApi";
import type { MyProduct } from "@/features/my/types";

export function useMyProductsQuery() {
    const isInitialized = useAuthStore((state) => state.isInitialized);
    const isLoggedIn = useAuthStore((state) => state.isLoggedIn);

    return useQuery({
        queryKey: ["my-products"],
        queryFn: async ({ signal }) => {
            const products: MyProduct[] = [];
            let cursor: string | undefined;
            do {
                const { data } = await myApi.myProducts({ cursor, size: 100 }, signal);
                if (!data.success) throw new Error(data.message);
                products.push(...data.data.content);
                cursor = data.data.hasNext ? (data.data.nextCursor ?? undefined) : undefined;
            } while (cursor !== undefined);
            return products;
        },
        enabled: isInitialized && isLoggedIn,
        retry: false,
    });
}
