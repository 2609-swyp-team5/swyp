"use client";

import { useQuery } from "@tanstack/react-query";

import { dataSource } from "@/common/lib/api/dataSource";
import { interestApi } from "@/features/interest/api/interestApi";
import { getInterestsMock } from "@/features/interest/api/interestMockApi";
import { useAuthStore } from "@/features/auth/store/authStore";
import { useMeQuery } from "@/features/member/hooks/queries/useMeQuery";
import type { InterestListItem } from "@/features/interest/types";

export const interestsQueryKey = ["interests", dataSource] as const;

export function useInterestsQuery(memberId?: number) {
    const isInitialized = useAuthStore((state) => state.isInitialized);
    const isLoggedIn = useAuthStore((state) => state.isLoggedIn);
    const member = useMeQuery();
    const currentMemberId = isLoggedIn ? member.data?.memberId : undefined;
    return useQuery({
        queryKey:
            memberId !== undefined
                ? ["interests", memberId]
                : [...interestsQueryKey, currentMemberId],
        queryFn: async ({ signal }) => {
            if (member.error) throw member.error;
            if (dataSource === "mock") {
                const response = await getInterestsMock();
                if (!response.success) throw new Error(response.message);
                return response.data.content;
            }
            const interests: InterestListItem[] = [];
            let cursor: string | undefined;
            do {
                const { data } = await interestApi.getInterests({ cursor, size: 100 }, signal);
                if (!data.success) throw new Error(data.message);
                interests.push(...data.data.content);
                if (!data.data.hasNext) return interests;
                if (!data.data.nextCursor || data.data.nextCursor === cursor)
                    throw new Error("관심상품 목록을 모두 불러오지 못했습니다.");
                cursor = data.data.nextCursor;
            } while (cursor);
            return interests;
        },
        enabled: isInitialized && isLoggedIn && (currentMemberId !== undefined || member.isError),
        staleTime: 0,
        refetchOnWindowFocus: false,
        retry: false,
    });
}
