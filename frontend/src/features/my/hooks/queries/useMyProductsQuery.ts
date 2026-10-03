"use client";

import { useQuery } from "@tanstack/react-query";

import { dataSource } from "@/common/lib/api/dataSource";
import { useAuthStore } from "@/features/auth/store/authStore";
import { myApi } from "@/features/my/api/myApi";
import { getMyProductsMock } from "@/features/sell/mocks/productMock";
import { productSummaryPageResponseSchema } from "@/features/sell/schemas/productResponseSchema";
import type { MyProduct } from "@/features/my/types";

const toMyProduct = (product: Omit<MyProduct, "platformName">): MyProduct => ({
    ...product,
    platformName: null,
});

export function useMyProductsQuery() {
    const isInitialized = useAuthStore((state) => state.isInitialized);
    const isLoggedIn = useAuthStore((state) => state.isLoggedIn);

    return useQuery({
        queryKey: ["my-products", dataSource],
        queryFn: async ({ signal }) => {
            if (dataSource === "mock") {
                const response = await getMyProductsMock();
                return response.content.map(toMyProduct);
            }

            const products: MyProduct[] = [];
            let cursor: string | undefined;
            do {
                const { data } = await myApi.myProducts({ cursor, size: 100 }, signal);
                if (!data.success) throw new Error(data.message);
                const page = productSummaryPageResponseSchema.parse(data.data);
                products.push(...page.content.map(toMyProduct));
                cursor = page.hasNext ? (page.nextCursor ?? undefined) : undefined;
            } while (cursor !== undefined);
            return products;
        },
        enabled: isInitialized && isLoggedIn,
        retry: false,
    });
}
