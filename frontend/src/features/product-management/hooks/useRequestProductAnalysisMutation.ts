"use client";

import { useMutation } from "@tanstack/react-query";

import { productApi } from "@/features/sell/api/productApi";
import {
    productAnalysisRequestResponseSchema,
    type ProductAnalysisRequestResponse,
} from "../schemas/productManagementResponseSchema";

type RequestProductAnalysisInput = {
    productId: number;
    force?: boolean;
};

/** 상품 시세 분석 요청 — 판매자 재분석은 force=true, 관심상품 요청은 기본값을 사용한다. */
export function useRequestProductAnalysisMutation() {
    return useMutation<ProductAnalysisRequestResponse, Error, RequestProductAnalysisInput>({
        mutationFn: async ({ productId, force = false }) => {
            const { data: response } = await productApi.requestProductAnalysis(productId, force);
            if (!response.success) {
                throw new Error(response.message);
            }

            return productAnalysisRequestResponseSchema.parse(response.data);
        },
    });
}
