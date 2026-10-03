"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { registerInterestMock } from "@/features/interest/api/interestMockApi";
import { interestsQueryKey } from "@/features/interest/hooks/queries/useInterestsQuery";
import type { InterestRegisterInput } from "@/features/interest/types";

export function useRegisterInterestMutation() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (input: InterestRegisterInput) => {
            const response = await registerInterestMock(input);
            if (!response.success) {
                throw new Error(response.message);
            }

            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: interestsQueryKey });
        },
    });
}
