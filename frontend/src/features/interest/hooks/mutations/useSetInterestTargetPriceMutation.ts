"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { dataSource } from "@/common/lib/api/dataSource";
import { interestApi } from "@/features/interest/api/interestApi";
import { setInterestTargetPriceMock } from "@/features/interest/api/interestMockApi";
import { interestsQueryKey } from "@/features/interest/hooks/queries/useInterestsQuery";
import { interestTargetPriceResponseSchema } from "@/features/interest/schemas/interestResponseSchema";

/** 관심상품 목표 구매가 설정·해제(null). 목록에 목표가가 들어 있어 성공하면 목록을 다시 불러온다. */
export function useSetInterestTargetPriceMutation(interestId: number) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (targetPrice: number | null) => {
            const response =
                dataSource === "api"
                    ? (await interestApi.setTargetPrice(interestId, targetPrice)).data
                    : await setInterestTargetPriceMock(interestId, targetPrice);
            if (!response.success) {
                throw new Error(response.message);
            }
            return interestTargetPriceResponseSchema.parse(response.data);
        },
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: interestsQueryKey });
        },
    });
}
