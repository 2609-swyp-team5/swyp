"use client";

import { useQuery } from "@tanstack/react-query";

import { dataSource } from "@/common/lib/api/dataSource";

import { productApi } from "@/features/sell/api/productApi";
import { productDetailSummaryResponseSchema } from "../schemas/productManagementResponseSchema";

import { getProductSummaryMock } from "../api/productManagementMockApi";
import { isValidProductId, productManagementQueryDefaults } from "./productManagementQueryOptions";

export const productSummaryQueryKey = (productId: number) =>
    ["product-management", "summary", dataSource, productId] as const;

export function useProductSummaryQuery(productId: number, options?: { enabled?: boolean }) {
    const enabled = isValidProductId(productId) && (options?.enabled ?? true);

    return useQuery({
        ...productManagementQueryDefaults,
        queryKey: productSummaryQueryKey(productId),
        queryFn: async () => {
            if (dataSource === "mock") {
                return getProductSummaryMock(productId);
            }

            const { data: response } = await productApi.getProductManagementSummary(productId);
            if (!response.success) {
                throw new Error(response.message);
            }

            return productDetailSummaryResponseSchema.parse(response.data);
        },
        enabled,
    });
}
