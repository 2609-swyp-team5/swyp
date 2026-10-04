"use client";

import { useQuery } from "@tanstack/react-query";

import { dataSource } from "@/common/lib/api/dataSource";

import { productApi } from "@/features/sell/api/productApi";
import { productCompetitionResponseSchema } from "../schemas/productManagementResponseSchema";

import { getProductCompetitionMock } from "../api/productManagementMockApi";
import type { ProductManagementPerspective } from "../types";
import { isValidProductId, productManagementQueryDefaults } from "./productManagementQueryOptions";

export const productCompetitionQueryKey = (
    productId: number,
    perspective: ProductManagementPerspective,
) => ["product-management", "competition", dataSource, perspective, productId] as const;

export function useProductCompetitionQuery(
    productId: number,
    options?: {
        enabled?: boolean;
        perspective?: ProductManagementPerspective;
    },
) {
    const enabled = isValidProductId(productId) && (options?.enabled ?? true);
    const perspective = options?.perspective ?? "SELL";

    return useQuery({
        ...productManagementQueryDefaults,
        queryKey: productCompetitionQueryKey(productId, perspective),
        queryFn: async () => {
            if (dataSource === "mock") {
                return getProductCompetitionMock(productId, perspective);
            }

            const { data: response } = await productApi.getProductCompetition(productId);
            if (!response.success) {
                throw new Error(response.message);
            }

            return productCompetitionResponseSchema.parse(response.data);
        },
        enabled,
    });
}
