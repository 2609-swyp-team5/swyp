"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { dataSource } from "@/common/lib/api/dataSource";
import { interestApi } from "@/features/interest/api/interestApi";
import { deleteInterestMock } from "@/features/interest/api/interestMockApi";
import { interestsQueryKey } from "@/features/interest/hooks/queries/useInterestsQuery";
import type { InterestListItem } from "@/features/interest/types";

export function useDeleteInterestMutation() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (interestId: number) => {
            const response =
                dataSource === "api"
                    ? (await interestApi.deleteInterest(interestId)).data
                    : await deleteInterestMock(interestId);
            if (!response.success) {
                throw new Error(response.message);
            }
        },
        onSuccess: (_, interestId) => {
            queryClient.setQueryData<InterestListItem[]>(interestsQueryKey, (interests) =>
                interests?.filter((interest) => interest.interestId !== interestId),
            );
            void queryClient.invalidateQueries({ queryKey: interestsQueryKey });
        },
    });
}
