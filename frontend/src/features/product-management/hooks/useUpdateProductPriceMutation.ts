"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { productResponseSchema } from "@/features/sell/schemas/productResponseSchema";
import { productApi } from "@/features/sell/api/productApi";

type UpdateProductPriceInput = {
    productId: number;
    price: number;
};

/** 판매 상품 관리의 추천 가격 적용 — 상품의 판매 희망가만 변경한다. */
export function useUpdateProductPriceMutation() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ productId, price }: UpdateProductPriceInput) => {
            const { data: response } = await productApi.updateProductPrice(productId, price);
            if (!response.success) {
                throw new Error(response.message);
            }

            return productResponseSchema.parse(response.data);
        },
        onSuccess: (product, { productId }) => {
            queryClient.setQueryData(["product", productId], product);
            void queryClient.invalidateQueries({ queryKey: ["my-products"] });
            void queryClient.invalidateQueries({ queryKey: ["product-management"] });
        },
    });
}
