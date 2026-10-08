"use client";

import { isAxiosError } from "axios";
import { useQuery } from "@tanstack/react-query";

import { productApi } from "@/features/sell/api/productApi";
import { productAnalysisResponseSchema } from "../schemas/productManagementResponseSchema";

import type { ProductManagementPerspective } from "../types";
import { isValidProductId, productManagementQueryDefaults } from "./productManagementQueryOptions";

export const productAnalysisQueryKey = (
    productId: number,
    perspective: ProductManagementPerspective,
) => ["product-management", "market-analysis", perspective, productId] as const;

export function useProductAnalysisQuery(
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
        queryKey: productAnalysisQueryKey(productId, perspective),
        queryFn: async () => {
            try {
                const { data: response } = await productApi.getProductAnalysis(
                    productId,
                    perspective,
                );
                if (!response.success) {
                    throw new Error(response.message);
                }

                // 아직 분석 이력이 없으면(분석 전·비교 매물 부족) 분석 필드가 모두 null로 내려와 빈 상태로 처리합니다.
                if (response.data.analysisId == null || response.data.recommendation == null) {
                    return null;
                }

                return productAnalysisResponseSchema.parse(response.data);
            } catch (error) {
                if (isAxiosError(error) && error.response?.status === 404) {
                    return null;
                }

                throw error;
            }
        },
        enabled,
    });
}
