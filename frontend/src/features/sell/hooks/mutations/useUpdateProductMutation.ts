"use client";

import { useMutation } from "@tanstack/react-query";

import { productApi } from "@/features/sell/api/productApi";
import type { ProductResponse, ProductUpdateInput } from "@/features/sell/types";

export interface UpdateProductInput extends ProductUpdateInput {
    id: number;
}

export function useUpdateProductMutation() {
    return useMutation<ProductResponse, Error, UpdateProductInput>({
        mutationFn: async ({ id, files, request }) => {
            const { data } = await productApi.updateProduct(id, { files, request });
            if (!data.success) {
                throw new Error(data.message);
            }
            return data.data;
        },
        retry: false,
    });
}
