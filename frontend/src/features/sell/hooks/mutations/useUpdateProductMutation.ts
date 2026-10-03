"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { productApi } from "@/features/sell/api/productApi";
import type {
    ProductRegisterError,
    ProductRegisterProgress,
    ProductResponse,
    ProductUpdateInput,
} from "@/features/sell/types";

export interface UpdateProductInput extends ProductUpdateInput {
    id: number;
}

interface UseUpdateProductMutationCallbacks {
    onProgress?: (progress: ProductRegisterProgress) => void;
}

export function useUpdateProductMutation(callbacks?: UseUpdateProductMutationCallbacks) {
    const queryClient = useQueryClient();

    return useMutation<ProductResponse, ProductRegisterError, UpdateProductInput>({
        mutationFn: async ({ id, files, request }) => {
            return productApi.updateProduct(id, { files, request }, callbacks?.onProgress);
        },
        retry: false,
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: ["my-products"] });
            void queryClient.invalidateQueries({ queryKey: ["product-management"] });
        },
    });
}
