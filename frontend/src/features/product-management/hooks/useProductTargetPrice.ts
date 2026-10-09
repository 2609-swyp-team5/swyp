"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { productApi } from "@/features/sell/api/productApi";
import { productTargetPriceResponseSchema } from "../schemas/productManagementResponseSchema";
import { isValidProductId, productManagementQueryDefaults } from "./productManagementQueryOptions";

export const productTargetPriceQueryKey = (productId: number) =>
    ["product-management", "target-price", productId] as const;

/** 내 상품 목표 판매가(본인 상품만 조회 가능). */
export function useProductTargetPriceQuery(productId: number) {
    return useQuery({
        ...productManagementQueryDefaults,
        queryKey: productTargetPriceQueryKey(productId),
        queryFn: async () => {
            const { data: response } = await productApi.getProductTargetPrice(productId);
            if (!response.success) {
                throw new Error(response.message);
            }
            return productTargetPriceResponseSchema.parse(response.data);
        },
        enabled: isValidProductId(productId),
    });
}

/** 목표 판매가 설정·해제(null). 응답으로 조회 캐시를 바로 바꾼다. */
export function useSetProductTargetPriceMutation(productId: number) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (targetPrice: number | null) => {
            const { data: response } = await productApi.setProductTargetPrice(
                productId,
                targetPrice,
            );
            if (!response.success) {
                throw new Error(response.message);
            }
            return productTargetPriceResponseSchema.parse(response.data);
        },
        onSuccess: (data) => {
            queryClient.setQueryData(productTargetPriceQueryKey(productId), data);
        },
    });
}
