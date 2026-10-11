"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { interestApi } from "@/features/interest/api/interestApi";
import { interestTargetsQueryKey } from "@/features/interest/hooks/queries/useInterestTargetsQuery";
import { interestCreateResponseSchema } from "@/features/interest/schemas/interestResponseSchema";
import type { InterestTarget, InterestToggleItem } from "@/features/interest/types";

type ToggleVariables = InterestTarget & { interestId?: number };

// 등록 응답 전까지 쓰는 임시 ID — 요청 중인 상품은 다시 토글하지 않으므로 서버로 보내지 않는다
const PENDING_INTEREST_ID = -1;

const isSameTarget = (item: InterestTarget, target: InterestTarget) =>
    item.source === target.source && item.targetId === target.targetId;

/** 하트를 먼저 바꾸고(낙관적 업데이트) 서버 결과로 확정하거나, 실패하면 그 상품만 되돌린다 */
export function useToggleInterestMutation(memberId?: number) {
    const queryClient = useQueryClient();
    const queryKey = interestTargetsQueryKey(memberId);
    const update = (updater: (items: InterestToggleItem[]) => InterestToggleItem[]) =>
        queryClient.setQueryData<InterestToggleItem[]>(queryKey, (current) =>
            updater(current ?? []),
        );

    return useMutation({
        mutationFn: async (target: ToggleVariables) => {
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
            // 진행 중인 목록 조회가 낙관적 상태를 덮어쓰지 않게 취소한다
            await queryClient.cancelQueries({ queryKey });
            update((items) => {
                const remaining = items.filter((item) => !isSameTarget(item, target));
                return target.interestId === undefined
                    ? [
                          {
                              source: target.source,
                              targetId: target.targetId,
                              interestId: PENDING_INTEREST_ID,
                          },
                          ...remaining,
                      ]
                    : remaining;
            });
        },
        onSuccess: (interestId, target) => {
            if (interestId === null) return;
            update((items) =>
                items.map((item) => (isSameTarget(item, target) ? { ...item, interestId } : item)),
            );
        },
        onError: (_error, target) => {
            update((items) => {
                const remaining = items.filter((item) => !isSameTarget(item, target));
                return target.interestId === undefined
                    ? remaining
                    : [
                          {
                              source: target.source,
                              targetId: target.targetId,
                              interestId: target.interestId,
                          },
                          ...remaining,
                      ];
            });
        },
        onSettled: () => {
            // 관심상품 목록 등 다른 화면 캐시만 백그라운드로 갱신한다(하트 캐시는 이미 확정됨)
            void queryClient.invalidateQueries({
                queryKey: ["interests"],
                predicate: (query) => query.queryKey[1] !== "targets",
            });
        },
    });
}
