"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { aiChatApi, type AiChatStreamHandlers } from "../../api/aiChatApi";
import { aiChatQueryKey, aiChatsQueryKey } from "../../queryKeys";
import type { AiChatDetail, AiChatSearchResult } from "../../schemas/aiChatSchema";

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
        onSuccess: async (answer, { answerId }) => {
            const refresh = () =>
                Promise.all([
                    queryClient.invalidateQueries({ queryKey: aiChatsQueryKey }),
                    queryClient.invalidateQueries({ queryKey: aiChatQueryKey(answer.chatId) }),
                ]);
            // 다시 만들기는 뒤 메시지가 바뀌므로 서버 내용을 받은 뒤 바꾼다
            if (answerId !== null) {
                await refresh();
                onDone?.(answer.chatId);
                return;
            }
            // 새 질문은 완료 이벤트의 질문·답변을 먼저 채워 두고 대화로 바꾼다 — 새 대화가 처음부터 조회되는 동안
            // 답변이 사라졌다 다시 나타나지 않게 한다. 서버 내용은 뒤에서 다시 받는다
            queryClient.setQueryData<AiChatDetail>(aiChatQueryKey(answer.chatId), (prev) => ({
                chatId: answer.chatId,
                title: prev?.title ?? answer.title,
                messages: [...(prev?.messages ?? []), answer.question, answer.answer],
            }));
            onDone?.(answer.chatId);
            void refresh();
        },
        // 서버는 질문을 받자마자 대화·질문을 저장하므로 실패해도 목록·대화를 다시 받아 저장된 질문을 바로 보여준다
        onError: (_error, { chatId }) => {
            void queryClient.invalidateQueries({ queryKey: aiChatsQueryKey });
            if (chatId !== null) {
                void queryClient.invalidateQueries({ queryKey: aiChatQueryKey(chatId) });
            }
        },
        onSettled: () => setLive(emptyLive),
    });

    return { ...mutation, live };
}
