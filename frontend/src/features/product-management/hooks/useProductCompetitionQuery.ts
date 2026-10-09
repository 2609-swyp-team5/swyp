"use client";

import { useQuery } from "@tanstack/react-query";

import { productApi } from "@/features/sell/api/productApi";
import { productCompetitionResponseSchema } from "../schemas/productManagementResponseSchema";

import type { ProductManagementPerspective } from "../types";
import { isValidProductId, productManagementQueryDefaults } from "./productManagementQueryOptions";

export const productCompetitionQueryKey = (
    productId: number,
    perspective: ProductManagementPerspective,
) => ["product-management", "competition", perspective, productId] as const;

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
            const { data: response } = await productApi.getProductCompetition(productId);
            if (!response.success) {
                throw new Error(response.message);
            }

            return productCompetitionResponseSchema.parse(response.data);
        },
        enabled,
    });
}
