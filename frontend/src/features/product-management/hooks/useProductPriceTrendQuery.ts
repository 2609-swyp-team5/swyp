"use client";

import { useQuery } from "@tanstack/react-query";

import { dataSource } from "@/common/lib/api/dataSource";

import { productApi } from "@/features/sell/api/productApi";
import { productPriceTrendResponseSchema } from "../schemas/productManagementResponseSchema";

import { getProductPriceTrendMock } from "../api/productManagementMockApi";
import { isValidProductId, productManagementQueryDefaults } from "./productManagementQueryOptions";

export const productPriceTrendQueryKey = (productId: number, days = 30) =>
    ["product-management", "price-trend", dataSource, productId, days] as const;

export function useProductPriceTrendQuery(
    productId: number,
    options?: { enabled?: boolean; days?: number },
) {
    const enabled = isValidProductId(productId) && (options?.enabled ?? true);
    const days = options?.days ?? 30;

    return useQuery({
        ...productManagementQueryDefaults,
        queryKey: productPriceTrendQueryKey(productId, days),
        queryFn: async () => {
            if (dataSource === "mock") {
                return getProductPriceTrendMock(productId);
            }

            const { data: response } = await productApi.getProductPriceTrend(productId);
            if (!response.success) {
                throw new Error(response.message);
            }

            return productPriceTrendResponseSchema.parse(response.data);
        },
        enabled,
    });
}
