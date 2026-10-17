"use client";

import { isAxiosError } from "axios";
import { useQuery } from "@tanstack/react-query";

import { productApi } from "@/features/sell/api/productApi";
import { productAnalysisResponseSchema } from "../schemas/productManagementResponseSchema";

import type { ProductManagementPerspective, ProductMarketAnalysis } from "../types";
import { isValidProductId, productManagementQueryDefaults } from "./productManagementQueryOptions";

export const productAnalysisQueryKey = (
    productId: number,
    perspective: ProductManagementPerspective,
) => ["product-management", "market-analysis", perspective, productId] as const;

/** 분석 결과가 없을 때 서버가 알려 주는 이유 — 분석 중·분석 전·비교 매물 부족·분석하지 않는 상품을 화면에서 나눠 보여 준다. */
export type AnalysisEmptyState = {
    status: "ANALYZING" | "SKIPPED" | "NOT_ANALYZED" | "UNAVAILABLE";
    skipMessage: string | null;
};

type ProductAnalysisQueryData = {
    analysis: ProductMarketAnalysis | null;
    emptyState: AnalysisEmptyState | null;
};

const emptyStatuses: AnalysisEmptyState["status"][] = [
    "ANALYZING",
    "SKIPPED",
    "NOT_ANALYZED",
    "UNAVAILABLE",
];

// 분석 결과 스키마에는 없는 빈 상태 필드(analysisStatus·analysisSkipMessage)를 응답에서 그대로 읽는다
const toEmptyState = (data: object): AnalysisEmptyState | null => {
    const { analysisStatus, analysisSkipMessage } = data as Record<string, unknown>;
    return emptyStatuses.includes(analysisStatus as AnalysisEmptyState["status"])
        ? {
              status: analysisStatus as AnalysisEmptyState["status"],
              skipMessage: typeof analysisSkipMessage === "string" ? analysisSkipMessage : null,
          }
        : null;
};

/** 결과와 빈 상태 이유를 한 번의 요청으로 받아 두고, 두 훅이 같은 캐시에서 각자 필요한 값만 꺼낸다. */
const productAnalysisQueryOptions = (
    productId: number,
    options?: { enabled?: boolean; perspective?: ProductManagementPerspective },
) => {
    const perspective = options?.perspective ?? "SELL";

    return {
        ...productManagementQueryDefaults,
        queryKey: productAnalysisQueryKey(productId, perspective),
        queryFn: async (): Promise<ProductAnalysisQueryData> => {
            try {
                const { data: response } = await productApi.getProductAnalysis(
                    productId,
                    perspective,
                );
                if (!response.success) {
                    throw new Error(response.message);
                }

                // 아직 분석 이력이 없으면(분석 전·비교 매물 부족) 분석 필드가 모두 null로 내려와 빈 상태로 처리하고,
                // 서버가 알려 준 이유(analysisStatus·analysisSkipMessage)는 따로 남긴다.
                if (response.data.analysisId == null || response.data.recommendation == null) {
                    return { analysis: null, emptyState: toEmptyState(response.data) };
                }

                return {
                    analysis: productAnalysisResponseSchema.parse(response.data),
                    emptyState: null,
                };
            } catch (error) {
                if (isAxiosError(error) && error.response?.status === 404) {
                    return { analysis: null, emptyState: null };
                }

                throw error;
            }
        },
        enabled: isValidProductId(productId) && (options?.enabled ?? true),
    };
};

export function useProductAnalysisQuery(
    productId: number,
    options?: {
        enabled?: boolean;
        perspective?: ProductManagementPerspective;
    },
) {
    return useQuery({
        ...productAnalysisQueryOptions(productId, options),
        select: (data) => data.analysis,
    });
}

/** 분석 결과가 없을 때의 이유(분석 중·분석 전·매물 부족·분석 안 함). 결과가 있으면 null. */
export function useProductAnalysisEmptyStateQuery(
    productId: number,
    options?: {
        enabled?: boolean;
        perspective?: ProductManagementPerspective;
    },
) {
    return useQuery({
        ...productAnalysisQueryOptions(productId, options),
        select: (data) => data.emptyState,
    });
}
