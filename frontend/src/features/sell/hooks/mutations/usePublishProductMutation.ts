"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { productApi } from "@/features/sell/api/productApi";
import { productPlatformPublishResponseSchema } from "@/features/sell/schemas/productResponseSchema";
import { productQueryKey } from "@/features/sell/hooks/queries/useProductQuery";
import type { MyPlatformType } from "@/features/my/types";

export function usePublishProductMutation() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({
            productId,
            platform,
        }: {
            productId: number;
            platform: MyPlatformType;
        }) => {
            const { data } = await productApi.publishProduct(productId, platform);

            if (!data.success) {
                throw new Error(data.message);
            }

            return productPlatformPublishResponseSchema.parse(data.data);
        },
        onSuccess: (_data, { productId }) => {
            void queryClient.invalidateQueries({ queryKey: productQueryKey(productId) });
            void queryClient.invalidateQueries({ queryKey: ["my-products"] });
            void queryClient.invalidateQueries({ queryKey: ["product-management"] });
        },
        retry: false,
    });
}
