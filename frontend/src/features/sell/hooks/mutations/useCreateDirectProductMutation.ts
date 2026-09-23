"use client";

import { useMutation } from "@tanstack/react-query";

import { productApi } from "@/features/sell/api/productApi";
import type { ProductResponse } from "@/features/sell/types";

interface UseCreateDirectProductMutationCallbacks {
    onSuccess?: (data: ProductResponse) => void;
    onError?: (error: Error) => void;
}

export function useCreateDirectProductMutation(
    callbacks?: UseCreateDirectProductMutationCallbacks,
) {
    return useMutation({
        mutationFn: productApi.createDirectProduct,
        retry: false,
        onSuccess: (data) => callbacks?.onSuccess?.(data),
        onError: (error) => callbacks?.onError?.(error),
    });
}
