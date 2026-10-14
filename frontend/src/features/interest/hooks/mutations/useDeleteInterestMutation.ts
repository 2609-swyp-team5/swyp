"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { interestApi } from "@/features/interest/api/interestApi";
import { interestsQueryKey } from "@/features/interest/hooks/queries/useInterestsQuery";
import {
    restoreInterestProductCaches,
    snapshotInterestProductCaches,
    updateInterestProductCaches,
    type InterestCacheSnapshot,
} from "@/features/interest/lib/interestProductCache";
import type { InterestTarget } from "@/features/interest/types";

type DeleteVariables = InterestTarget & { interestId: number };
type DeleteContext = { snapshots: InterestCacheSnapshot };

export function useDeleteInterestMutation() {
    const queryClient = useQueryClient();

    return useMutation<void, Error, DeleteVariables, DeleteContext>({
        mutationFn: async ({ interestId }) => {
            const response = (await interestApi.deleteInterest(interestId)).data;
            if (!response.success) {
                throw new Error(response.message);
            }
        },
        retry: false,
        onMutate: async (target) => {
            await Promise.all([
                queryClient.cancelQueries({ queryKey: ["search"] }),
                queryClient.cancelQueries({
                    queryKey: ["search-product-detail", target.targetId],
                }),
                queryClient.cancelQueries({ queryKey: ["home", "popular-products"] }),
            ]);
            const snapshots = snapshotInterestProductCaches(queryClient, target);
            updateInterestProductCaches(queryClient, target, {
                favorite: false,
                interestId: null,
            });
            return { snapshots };
        },
        onSuccess: (_data, target) => {
            updateInterestProductCaches(queryClient, target, {
                favorite: false,
                interestId: null,
            });
        },
        onError: (_error, _target, context) => {
            if (context) restoreInterestProductCaches(queryClient, context.snapshots);
        },
        onSettled: () => {
            void queryClient.invalidateQueries({ queryKey: interestsQueryKey });
        },
    });
}
