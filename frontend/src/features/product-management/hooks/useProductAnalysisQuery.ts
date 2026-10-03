"use client";

import { useQuery } from "@tanstack/react-query";

import { dataSource } from "@/common/lib/api/dataSource";

import { productApi } from "@/features/sell/api/productApi";
import { productAnalysisResponseSchema } from "../schemas/productManagementResponseSchema";

import { getProductMarketAnalysisMock } from "../api/productManagementMockApi";
import type { AnalysisRecommendation, ProductManagementPerspective } from "../types";
import { isValidProductId, productManagementQueryDefaults } from "./productManagementQueryOptions";

export const productAnalysisQueryKey = (
    productId: number,
    perspective: ProductManagementPerspective,
    mockRecommendation?: AnalysisRecommendation,
) =>
    [
        "product-management",
        "market-analysis",
        dataSource,
        perspective,
        productId,
        mockRecommendation,
    ] as const;

export function useProductAnalysisQuery(
    productId: number,
    options?: {
        enabled?: boolean;
        perspective?: ProductManagementPerspective;
        mockRecommendation?: AnalysisRecommendation;
    },
) {
    const enabled = isValidProductId(productId) && (options?.enabled ?? true);
    const perspective = options?.perspective ?? "SELL";
    const mockRecommendation = options?.mockRecommendation;

    return useQuery({
        ...productManagementQueryDefaults,
        queryKey: productAnalysisQueryKey(productId, perspective, mockRecommendation),
        queryFn: async () => {
            if (dataSource === "mock") {
                return getProductMarketAnalysisMock(productId, perspective, mockRecommendation);
            }

            const { data: response } = await productApi.getProductAnalysis(productId);
            if (!response.success) {
                throw new Error(response.message);
            }

            return productAnalysisResponseSchema.parse(response.data);
        },
        enabled,
    });
}
