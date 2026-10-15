"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { aiChatApi, type AiChatStreamHandlers } from "../../api/aiChatApi";
import { aiChatQueryKey, aiChatsQueryKey } from "../../queryKeys";
import type { AiChatSearchResult } from "../../schemas/aiChatSchema";

/** 스트림으로 받는 중인 답변 — 완료되면 대화 조회 결과로 바뀐다. */
export type AiChatLiveAnswer = {
    stepText: string | null;
    result: AiChatSearchResult | null;
    text: string;
};

const emptyLive: AiChatLiveAnswer = { stepText: null, result: null, text: "" };

export type SendAiChatVariables = {
    chatId: number | null;
    question: string;
    /** 다시 만들 답변 — 질문이 비어 있으면 같은 질문으로 다시 만들고, 있으면 질문을 고친다 */
    answerId: number | null;
};

/** 질문 보내기(새 대화·이어서 질문·다시 만들기·질문 수정) — 진행 단계·카드·문장을 오는 대로 `live`에 담는다. */
export function useSendAiChatMutation(onDone?: (chatId: number) => void) {
    const queryClient = useQueryClient();
    const [live, setLive] = useState<AiChatLiveAnswer>(emptyLive);

    const mutation = useMutation({
        mutationFn: ({ chatId, question, answerId }: SendAiChatVariables) => {
            setLive(emptyLive);
            const handlers: AiChatStreamHandlers = {
                onStep: (step, message) =>
                    setLive((prev) => ({
                        ...prev,
                        stepText: `${step.index}/${step.total} ${message}`,
                    })),
                onSearchResult: (result) => setLive((prev) => ({ ...prev, result })),
                onDelta: (text) => setLive((prev) => ({ ...prev, text: prev.text + text })),
            };
            if (chatId !== null && answerId !== null) {
                return aiChatApi.regenerate(chatId, answerId, question || undefined, handlers);
            }
            return chatId === null
                ? aiChatApi.startChat(question, handlers)
                : aiChatApi.askInChat(chatId, question, handlers);
        },
        onSuccess: async (answer) => {
            await Promise.all([
                queryClient.invalidateQueries({ queryKey: aiChatsQueryKey }),
                queryClient.invalidateQueries({ queryKey: aiChatQueryKey(answer.chatId) }),
            ]);
            onDone?.(answer.chatId);
        },
        onSettled: () => setLive(emptyLive),
    });

    return { ...mutation, live };
}
