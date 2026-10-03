"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { interestApi } from "@/features/interest/api/interestApi";
import type { InterestItem, InterestTarget } from "@/features/interest/types";

export function useToggleInterestMutation(memberId?: number) {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (target: InterestTarget & { interestId?: number }) => {
            if (target.interestId !== undefined) {
                const { data } = await interestApi.interestDelete(target.interestId);
                if (!data.success) throw new Error(data.message);
                return null;
            }
            const { data } = await interestApi.interestRegister({
                source: target.source,
                targetId: target.targetId,
            });
            if (!data.success) throw new Error(data.message);
            return data.data.interestId;
        },
        retry: false,
        onSuccess: async (interestId, target) => {
            const queryKey = ["interests", memberId];
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
        },
    });
}
