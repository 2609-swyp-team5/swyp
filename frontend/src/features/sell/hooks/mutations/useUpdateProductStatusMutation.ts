"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { productApi } from "@/features/sell/api/productApi";
import { productQueryKey } from "@/features/sell/hooks/queries/useProductQuery";
import type { ProductResponse, ProductStatusUpdateRequest } from "@/features/sell/types";

interface UpdateProductStatusInput extends ProductStatusUpdateRequest {
    id: number;
}

export function useUpdateProductStatusMutation() {
    const queryClient = useQueryClient();

    return useMutation<ProductResponse, Error, UpdateProductStatusInput>({
        mutationFn: async ({ id, ...request }) => {
            const { data } = await productApi.updateProductStatus(id, request);

            if (!data.success) {
                throw new Error(data.message);
            }

            return data.data;
        },
        onSuccess: (_data, { id }) => {
            void queryClient.invalidateQueries({ queryKey: productQueryKey(id) });
            void queryClient.invalidateQueries({ queryKey: ["my-products"] });
            void queryClient.invalidateQueries({ queryKey: ["product-management"] });
        },
        retry: false,
    });
}
