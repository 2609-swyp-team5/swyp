"use client";

import { useQuery } from "@tanstack/react-query";

import { aiChatApi } from "../../api/aiChatApi";
import { aiChatQueryKey } from "../../queryKeys";

/** 대화 하나의 질문·답변 전체. 대화를 고르기 전(null)에는 요청하지 않는다. */
export function useAiChatQuery(chatId: number | null) {
    return useQuery({
        queryKey: aiChatQueryKey(chatId),
        queryFn: () => aiChatApi.getChat(chatId as number),
        enabled: chatId !== null,
    });
}
