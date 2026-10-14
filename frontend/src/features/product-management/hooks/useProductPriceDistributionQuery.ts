"use client";

import { useQuery } from "@tanstack/react-query";

import { productApi } from "@/features/sell/api/productApi";
import { productPriceDistributionResponseSchema } from "../schemas/productManagementResponseSchema";

import { isValidProductId, productManagementQueryDefaults } from "./productManagementQueryOptions";

export const productPriceDistributionQueryKey = (productId: number, days = 90) =>
    ["product-management", "price-distribution", productId, days] as const;

export function useProductPriceDistributionQuery(
    productId: number,
    options?: { enabled?: boolean; days?: number },
) {
    const enabled = isValidProductId(productId) && (options?.enabled ?? true);
    const days = options?.days ?? 90;

    return useQuery({
        ...productManagementQueryDefaults,
        queryKey: productPriceDistributionQueryKey(productId, days),
        queryFn: async () => {
            const { data: response } = await productApi.getProductPriceDistribution(
                productId,
                days,
            );
            if (!response.success) {
                throw new Error(response.message);
            }

            return productPriceDistributionResponseSchema.parse(response.data);
        },
        enabled,
    });
}
