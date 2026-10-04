"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { productApi } from "@/features/sell/api/productApi";
import { productQueryKey } from "@/features/sell/hooks/queries/useProductQuery";
import type { ProductResponse, ProductStatus } from "@/features/sell/types";

interface UpdateProductStatusInput {
    id: number;
    status: ProductStatus;
}

export function useUpdateProductStatusMutation() {
    const queryClient = useQueryClient();

    return useMutation<ProductResponse, Error, UpdateProductStatusInput>({
        mutationFn: async ({ id, status }) => {
            const { data } = await productApi.updateProductStatus(id, status);

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
