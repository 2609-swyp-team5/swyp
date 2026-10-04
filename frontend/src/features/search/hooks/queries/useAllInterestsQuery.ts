"use client";

import { useQuery } from "@tanstack/react-query";

import { useAuthStore } from "@/features/auth/store/authStore";
import { searchApi } from "@/features/search/api/searchApi";
import { interestListResponseSchema } from "@/features/search/schemas/interestResponseSchema";
import type { InterestItem } from "@/features/search/types";
import { useMeQuery } from "@/features/member/hooks/queries/useMeQuery";

export function useAllInterestsQuery(memberId?: number) {
    const isInitialized = useAuthStore((state) => state.isInitialized);
    const isLoggedIn = useAuthStore((state) => state.isLoggedIn);
    const member = useMeQuery();
    return useQuery({
        queryKey: ["interests", "search", memberId],
        queryFn: async ({ signal }) => {
            if (member.error) throw member.error;
            const interests: InterestItem[] = [];
            let cursor: string | undefined;
            do {
                const { data } = await searchApi.interestList({ cursor, size: 100 }, signal);
                if (!data.success) throw new Error(data.message);
                const page = interestListResponseSchema.parse(data.data);
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
