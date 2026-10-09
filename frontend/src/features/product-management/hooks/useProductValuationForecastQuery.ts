"use client";

import { useQuery } from "@tanstack/react-query";

import { productApi } from "@/features/sell/api/productApi";
import { productValuationForecastResponseSchema } from "../schemas/productManagementResponseSchema";

import { isValidProductId, productManagementQueryDefaults } from "./productManagementQueryOptions";

export const productValuationForecastQueryKey = (productId: number) =>
    ["product-management", "valuation-forecast", productId] as const;

export function useProductValuationForecastQuery(
    productId: number,
    options?: { enabled?: boolean },
) {
    const enabled = isValidProductId(productId) && (options?.enabled ?? true);

    return useQuery({
        ...productManagementQueryDefaults,
        queryKey: productValuationForecastQueryKey(productId),
        queryFn: async () => {
            const { data: response } = await productApi.getProductValuationForecast(productId);
            if (!response.success) {
                throw new Error(response.message);
            }

            return productValuationForecastResponseSchema.parse(response.data);
        },
        enabled,
    });
}
