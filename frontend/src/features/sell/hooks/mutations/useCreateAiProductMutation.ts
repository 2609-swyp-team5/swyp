"use client";

import { useMutation } from "@tanstack/react-query";

import { productApi } from "@/features/sell/api/productApi";
import type { AiProductCreateInput, ProductResponse } from "@/features/sell/types";

interface UseCreateAiProductMutationCallbacks {
    onSuccess?: (data: ProductResponse) => void;
    onError?: (error: Error) => void;
}

export function useCreateAiProductMutation(callbacks?: UseCreateAiProductMutationCallbacks) {
    return useMutation({
        mutationFn: async (input: AiProductCreateInput) => {
            const { data } = await productApi.createAiProduct(input);
            if (!data.success) {
                throw new Error(data.message);
            }
            return data.data;
        },
        retry: false,
        onSuccess: (data) => callbacks?.onSuccess?.(data),
        onError: (error) => callbacks?.onError?.(error),
    });
}
