"use client";

import { useQuery } from "@tanstack/react-query";

import { dataSource } from "@/common/lib/api/dataSource";

import { productApi } from "@/features/sell/api/productApi";
import { productValuationForecastResponseSchema } from "../schemas/productManagementResponseSchema";

import { getProductValuationForecastMock } from "../api/productManagementMockApi";
import { isValidProductId, productManagementQueryDefaults } from "./productManagementQueryOptions";

export const productValuationForecastQueryKey = (productId: number) =>
    ["product-management", "valuation-forecast", dataSource, productId] as const;

export function useProductValuationForecastQuery(
    productId: number,
    options?: { enabled?: boolean },
) {
    const enabled = isValidProductId(productId) && (options?.enabled ?? true);

    return useQuery({
        ...productManagementQueryDefaults,
        queryKey: productValuationForecastQueryKey(productId),
        queryFn: async () => {
            if (dataSource === "mock") {
                return getProductValuationForecastMock(productId);
            }

            const { data: response } = await productApi.getProductValuationForecast(productId);
            if (!response.success) {
                throw new Error(response.message);
            }

            return productValuationForecastResponseSchema.parse(response.data);
        },
        enabled,
    });
}
