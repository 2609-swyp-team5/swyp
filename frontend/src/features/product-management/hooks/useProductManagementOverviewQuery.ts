"use client";

import { useQuery } from "@tanstack/react-query";

import { productApi } from "@/features/sell/api/productApi";
import { productManagementOverviewResponseSchema } from "../schemas/productManagementResponseSchema";
import { isValidProductId, productManagementQueryDefaults } from "./productManagementQueryOptions";

export const productManagementOverviewQueryKey = (productId: number) =>
    ["product-management", "overview", productId] as const;

export function useProductManagementOverviewQuery(
    productId: number,
    options?: { enabled?: boolean },
) {
    const enabled = isValidProductId(productId) && (options?.enabled ?? true);

    return useQuery({
        ...productManagementQueryDefaults,
        queryKey: productManagementOverviewQueryKey(productId),
        queryFn: async () => {
            const { data: response } = await productApi.getProductManagementOverview(productId);
            if (!response.success) {
                throw new Error(response.message);
            }

            return productManagementOverviewResponseSchema.parse(response.data);
        },
        enabled,
    });
}
