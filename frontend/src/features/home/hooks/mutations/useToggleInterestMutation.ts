"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { homeApi } from "@/features/home/api/homeApi";
import { interestCreateResponseSchema } from "@/features/home/schemas/interestResponseSchema";
import type { InterestItem, InterestTarget } from "@/features/home/types";

export function useToggleInterestMutation(memberId?: number) {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (target: InterestTarget & { interestId?: number }) => {
            if (target.interestId !== undefined) {
                const { data } = await homeApi.interestDelete(target.interestId);
                if (!data.success) throw new Error(data.message);
                return null;
            }
            const { data } = await homeApi.interestRegister({
                source: target.source,
                targetId: target.targetId,
            });
            if (!data.success) throw new Error(data.message);
            return interestCreateResponseSchema.parse(data.data).interestId;
        },
        retry: false,
        onSuccess: async (interestId, target) => {
            const queryKey = ["interests", "home", memberId];
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
