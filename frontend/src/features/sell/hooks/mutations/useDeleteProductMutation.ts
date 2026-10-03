"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { productApi } from "@/features/sell/api/productApi";
import { productQueryKey } from "@/features/sell/hooks/queries/useProductQuery";

export function useDeleteProductMutation() {
    const queryClient = useQueryClient();

    return useMutation<void, Error, number>({
        mutationFn: async (id) => {
            const { data } = await productApi.deleteProduct(id);
            if (!data.success) {
                throw new Error(data.message);
            }
        },
        onSuccess: (_, id) => {
            queryClient.removeQueries({ queryKey: productQueryKey(id) });
            void queryClient.invalidateQueries({ queryKey: ["my-products"] });
            void queryClient.invalidateQueries({ queryKey: ["product-management"] });
        },
        retry: false,
    });
}
