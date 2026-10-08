"use client";

import { useQuery } from "@tanstack/react-query";

import { dataSource } from "@/common/lib/api/dataSource";
import { productApi } from "@/features/sell/api/productApi";
import { getProductManagementOverviewMock } from "../api/productManagementMockApi";
import { productManagementOverviewResponseSchema } from "../schemas/productManagementResponseSchema";
import { isValidProductId, productManagementQueryDefaults } from "./productManagementQueryOptions";

export const productManagementOverviewQueryKey = (productId: number) =>
    ["product-management", "overview", dataSource, productId] as const;

export function useProductManagementOverviewQuery(
    productId: number,
    options?: { enabled?: boolean },
) {
    const enabled = isValidProductId(productId) && (options?.enabled ?? true);

    return useQuery({
        ...productManagementQueryDefaults,
        queryKey: productManagementOverviewQueryKey(productId),
        queryFn: async () => {
            if (dataSource === "mock") {
                return getProductManagementOverviewMock(productId);
            }

            const { data: response } = await productApi.getProductManagementOverview(productId);
            if (!response.success) {
                throw new Error(response.message);
            }

            return productManagementOverviewResponseSchema.parse(response.data);
        },
        enabled,
    });
}
