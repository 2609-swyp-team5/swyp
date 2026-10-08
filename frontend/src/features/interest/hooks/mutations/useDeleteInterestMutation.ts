"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { interestApi } from "@/features/interest/api/interestApi";
import { interestsQueryKey } from "@/features/interest/hooks/queries/useInterestsQuery";

export function useDeleteInterestMutation() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (interestId: number) => {
            const response = (await interestApi.deleteInterest(interestId)).data;
            if (!response.success) {
                throw new Error(response.message);
            }
        },
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: interestsQueryKey });
        },
    });
}
