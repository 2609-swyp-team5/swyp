"use client";

import { useInfiniteQuery } from "@tanstack/react-query";

import { aiChatApi } from "../../api/aiChatApi";
import { aiChatsQueryKey } from "../../queryKeys";

/** 최근 대화 목록(최근 대화순, 20개씩). */
export function useAiChatsQuery() {
    return useInfiniteQuery({
        queryKey: aiChatsQueryKey,
        initialPageParam: undefined as string | undefined,
        queryFn: ({ pageParam }) => aiChatApi.getChats(pageParam),
        getNextPageParam: (last) => (last.hasNext ? (last.nextCursor ?? undefined) : undefined),
    });
}
