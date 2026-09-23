"use client";

import { useMutation } from "@tanstack/react-query";

import { productApi } from "@/features/sell/api/productApi";
import type { ProductResponse } from "@/features/sell/types";

interface UseCreateAiProductMutationCallbacks {
    onSuccess?: (data: ProductResponse) => void;
    onError?: (error: Error) => void;
}

export function useCreateAiProductMutation(callbacks?: UseCreateAiProductMutationCallbacks) {
    return useMutation({
        mutationFn: productApi.createAiProduct,
        retry: false,
        onSuccess: (data) => callbacks?.onSuccess?.(data),
        onError: (error) => callbacks?.onError?.(error),
    });
}
