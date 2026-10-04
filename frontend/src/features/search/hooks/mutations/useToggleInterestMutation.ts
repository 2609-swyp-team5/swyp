"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { searchApi } from "@/features/search/api/searchApi";
import { interestCreateResponseSchema } from "@/features/search/schemas/interestResponseSchema";
import type { InterestItem, InterestTarget } from "@/features/search/types";

export function useToggleInterestMutation(memberId?: number) {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (target: InterestTarget & { interestId?: number }) => {
            if (target.interestId !== undefined) {
                const { data } = await searchApi.interestDelete(target.interestId);
                if (!data.success) throw new Error(data.message);
                return null;
            }
            const { data } = await searchApi.interestRegister({
                source: target.source,
                targetId: target.targetId,
            });
            if (!data.success) throw new Error(data.message);
            return interestCreateResponseSchema.parse(data.data).interestId;
        },
        retry: false,
        onSuccess: async (interestId, target) => {
            const queryKey = ["interests", "search", memberId];
            await queryClient.cancelQueries({ queryKey });
            queryClient.setQueryData<InterestItem[]>(queryKey, (current) => {
                const remaining = (current ?? []).filter(
                    (item) => item.source !== target.source || item.targetId !== target.targetId,
                );
                return interestId === null
                    ? remaining
                    : [
                          { source: target.source, targetId: target.targetId, interestId },
                          ...remaining,
                      ];
            });
            await queryClient.invalidateQueries({ queryKey: ["interests"] });
        },
    });
}
