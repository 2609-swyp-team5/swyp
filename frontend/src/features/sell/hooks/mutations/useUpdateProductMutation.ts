"use client";

import { useMutation } from "@tanstack/react-query";

import { productApi } from "@/features/sell/api/productApi";
import type { ProductResponse, ProductUpdateInput } from "@/features/sell/types";

export interface UpdateProductInput extends ProductUpdateInput {
    id: number;
}

export function useUpdateProductMutation() {
    return useMutation<ProductResponse, Error, UpdateProductInput>({
        mutationFn: ({ id, files, request }) => productApi.updateProduct(id, { files, request }),
        retry: false,
    });
}
