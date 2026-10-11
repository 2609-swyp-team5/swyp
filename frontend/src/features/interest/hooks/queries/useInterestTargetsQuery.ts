"use client";

import { useQuery } from "@tanstack/react-query";

import { useAuthStore } from "@/features/auth/store/authStore";
import { interestApi } from "@/features/interest/api/interestApi";
import { interestToggleListResponseSchema } from "@/features/interest/schemas/interestToggleSchema";
import type { InterestToggleItem } from "@/features/interest/types";
import { useMeQuery } from "@/features/member/hooks/queries/useMeQuery";

export const interestTargetsQueryKey = (memberId?: number) =>
    ["interests", "targets", memberId] as const;

/** 하트 표시용으로 내 관심상품 전체(출처·대상 ID)를 모두 불러온다 */
export function useInterestTargetsQuery(memberId?: number) {
    const isInitialized = useAuthStore((state) => state.isInitialized);
    const isLoggedIn = useAuthStore((state) => state.isLoggedIn);
    const member = useMeQuery();
    return useQuery({
        queryKey: interestTargetsQueryKey(memberId),
        queryFn: async ({ signal }) => {
            if (member.error) throw member.error;
            const interests: InterestToggleItem[] = [];
            let cursor: string | undefined;
            do {
                const { data } = await interestApi.getInterests({ cursor, size: 100 }, signal);
                if (!data.success) throw new Error(data.message);
                const page = interestToggleListResponseSchema.parse(data.data);
                interests.push(...page.content);
                if (!page.hasNext) return interests;
                if (!page.nextCursor || page.nextCursor === cursor)
                    throw new Error("관심상품 목록을 모두 불러오지 못했습니다.");
                cursor = page.nextCursor;
            } while (cursor);
            return interests;
        },
        enabled: isInitialized && isLoggedIn && (memberId !== undefined || member.isError),
        staleTime: 0,
        refetchOnWindowFocus: false,
        retry: false,
    });
}
