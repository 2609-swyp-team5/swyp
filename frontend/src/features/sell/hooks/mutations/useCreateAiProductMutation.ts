"use client";

import { useMutation } from "@tanstack/react-query";

import { productApi } from "@/features/sell/api/productApi";
import type {
    AiProductCreateInput,
    ProductRegisterError,
    ProductRegisterProgress,
    ProductResponse,
} from "@/features/sell/types";

interface UseCreateAiProductMutationCallbacks {
    onSuccess?: (data: ProductResponse) => void;
    onError?: (error: ProductRegisterError) => void;
    onProgress?: (progress: ProductRegisterProgress) => void;
}

export function useCreateAiProductMutation(callbacks?: UseCreateAiProductMutationCallbacks) {
    return useMutation<ProductResponse, ProductRegisterError, AiProductCreateInput>({
        mutationFn: async (input: AiProductCreateInput) => {
            return productApi.createAiProduct(input, callbacks?.onProgress);
        },
        retry: false,
        onSuccess: (data) => callbacks?.onSuccess?.(data),
        onError: (error) => callbacks?.onError?.(error),
    });
}
