"use client";

import { useMutation } from "@tanstack/react-query";

import { productApi } from "@/features/sell/api/productApi";
import type {
    DirectProductCreateInput,
    ProductRegisterError,
    ProductRegisterProgress,
    ProductResponse,
} from "@/features/sell/types";

interface UseCreateDirectProductMutationCallbacks {
    onSuccess?: (data: ProductResponse) => void;
    onError?: (error: ProductRegisterError) => void;
    onProgress?: (progress: ProductRegisterProgress) => void;
}

export function useCreateDirectProductMutation(
    callbacks?: UseCreateDirectProductMutationCallbacks,
) {
    return useMutation<ProductResponse, ProductRegisterError, DirectProductCreateInput>({
        mutationFn: async (input: DirectProductCreateInput) => {
            return productApi.createDirectProduct(input, callbacks?.onProgress);
        },
        retry: false,
        onSuccess: (data) => callbacks?.onSuccess?.(data),
        onError: (error) => callbacks?.onError?.(error),
    });
}
