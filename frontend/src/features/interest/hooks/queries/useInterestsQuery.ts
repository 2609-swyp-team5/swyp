"use client";

import { useQuery } from "@tanstack/react-query";
import { interestApi } from "@/features/interest/api/interestApi";
import type { InterestItem } from "@/features/interest/types";

export function useInterestsQuery(memberId?: number) {
    return useQuery({
        queryKey: ["interests", memberId],
        queryFn: async ({ signal }) => {
            const interests: InterestItem[] = [];
            let cursor: string | undefined;
            do {
                const { data } = await interestApi.interestList(cursor, signal);
                if (!data.success) throw new Error(data.message);
                interests.push(...data.data.content);
                if (!data.data.hasNext) return interests;
                if (!data.data.nextCursor || data.data.nextCursor === cursor)
                    throw new Error("관심상품 목록을 모두 불러오지 못했습니다.");
                cursor = data.data.nextCursor;
            } while (cursor);
            return interests;
        },
        enabled: memberId !== undefined,
        retry: false,
    });
}
