"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { interestApi } from "@/features/interest/api/interestApi";
import { interestsQueryKey } from "@/features/interest/hooks/queries/useInterestsQuery";
import type { InterestRegisterInput } from "@/features/interest/types";
import { interestCreateResponseSchema } from "@/features/interest/schemas/interestResponseSchema";

export function useRegisterInterestMutation() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (input: InterestRegisterInput) => {
            const response = (await interestApi.registerInterest(input)).data;
            if (!response.success) {
                throw new Error(response.message);
            }

            return interestCreateResponseSchema.parse(response.data);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: interestsQueryKey });
        },
    });
}
