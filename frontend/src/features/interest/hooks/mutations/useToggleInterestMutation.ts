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
import { interestCreateResponseSchema } from "@/features/interest/schemas/interestResponseSchema";
import type { InterestTarget } from "@/features/interest/types";

type ToggleVariables = InterestTarget & { interestId?: number };
type ToggleContext = { snapshots: InterestCacheSnapshot };

/** 하트를 먼저 바꾸고(낙관적 업데이트) 모든 상품 조회 캐시를 함께 갱신한다. */
export function useToggleInterestMutation() {
    const queryClient = useQueryClient();

    return useMutation<number | null, Error, ToggleVariables, ToggleContext>({
        mutationFn: async (target) => {
            if (target.interestId !== undefined) {
                const { data } = await interestApi.deleteInterest(target.interestId);
                if (!data.success) throw new Error(data.message);
                return null;
            }
            const { data } = await interestApi.registerInterest({
                source: target.source,
                targetId: target.targetId,
            });
            if (!data.success) throw new Error(data.message);
            return interestCreateResponseSchema.parse(data.data).interestId;
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
                favorite: target.interestId === undefined,
                interestId: null,
            });
            return { snapshots };
        },
        onSuccess: (interestId, target) => {
            updateInterestProductCaches(queryClient, target, {
                favorite: interestId !== null,
                interestId,
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
