"use client";

import { useQuery } from "@tanstack/react-query";

import { aiChatApi } from "../../api/aiChatApi";
import { aiChatSuggestionsQueryKey } from "../../queryKeys";

/** 추천 질문(내 판매 상품·관심 상품·인기 검색어로 서버가 만든 질문, 누르면 그대로 보낸다). */
export function useAiChatSuggestionsQuery(size = 5) {
    return useQuery({
        queryKey: [...aiChatSuggestionsQueryKey, size],
        queryFn: () => aiChatApi.getSuggestions(size),
        staleTime: 5 * 60 * 1000,
    });
}
