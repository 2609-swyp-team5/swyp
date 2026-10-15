import { api } from "@/common/lib/api/client";
import type { ApiResponse } from "@/common/lib/api/types";
import { useAuthStore } from "@/features/auth/store/authStore";

import {
    type AiChatAnswer,
    aiChatAnswerSchema,
    type AiChatDetail,
    aiChatDetailSchema,
    type AiChatPage,
    aiChatPageSchema,
    type AiChatSearchResult,
    type AiChatStep,
    aiChatStreamEventSchema,
    type AiChatSuggestion,
    aiChatSuggestionSchema,
} from "../schemas/aiChatSchema";

const unwrap = <T>(response: { data: ApiResponse<T> }): T => {
    if (!response.data.success) {
        throw new Error(response.data.message);
    }
    return response.data.data;
};

export type AiChatStreamStep = {
    step: AiChatStep;
    status: "START" | "DONE" | "SKIP";
    index: number;
    total: number;
};

export type AiChatStreamHandlers = {
    /** 진행 단계(질문 이해 → 매물·시세 찾기 → 답변 쓰기)와 그 단계 문구 */
    onStep?: (step: AiChatStreamStep, message: string) => void;
    /** 매물·시세 찾기 결과 — 답변 문장보다 먼저 와서 카드를 먼저 그린다 */
    onSearchResult?: (result: AiChatSearchResult) => void;
    /** 답변 문장 조각 */
    onDelta?: (text: string) => void;
};

const sseUrl = (path: string) => `${(api.defaults.baseURL ?? "").replace(/\/$/, "")}${path}`;

/**
 * 질문을 보내고 답변을 SSE(같은 POST에 Accept: text/event-stream)로 받는다. 스트림 전 오류(404, 503 AI_CHAT_BUSY 등)는
 * 일반 JSON 응답이라 그 문구로 실패한다.
 */
const streamAnswer = async (
    path: string,
    body: { message?: string },
    handlers: AiChatStreamHandlers,
): Promise<AiChatAnswer> => {
    const open = () => {
        const headers = new Headers({
            Accept: "text/event-stream",
            "Content-Type": "application/json",
        });
        const token = useAuthStore.getState().accessToken;
        if (token) {
            headers.set("Authorization", `Bearer ${token}`);
        }
        return fetch(sseUrl(path), {
            method: "POST",
            headers,
            body: JSON.stringify(body),
            credentials: "include",
        });
    };

    let response = await open();
    if (response.status === 401 && useAuthStore.getState().accessToken) {
        await useAuthStore.getState().refresh();
        response = await open();
    }
    if (!response.ok || !response.body) {
        const error = (await response.json().catch(() => null)) as ApiResponse<unknown> | null;
        throw new Error(error?.message ?? "답변을 받지 못했어요. 잠시 후 다시 시도해 주세요.");
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    for (;;) {
        const { value, done } = await reader.read();
        buffer += decoder.decode(value, { stream: !done });
        const blocks = buffer.split(/\r?\n\r?\n/);
        buffer = done ? "" : (blocks.pop() ?? "");
        for (const block of blocks) {
            const data = block
                .split(/\r?\n/)
                .filter((line) => line.startsWith("data:"))
                .map((line) => line.slice("data:".length))
                .join("");
            if (!data) {
                continue; // ":ping" 같은 연결 유지용 주석
            }
            const event = aiChatStreamEventSchema.parse(JSON.parse(data));
            const payload = event.data;
            if (!event.success || !payload || payload.event === "error") {
                void reader.cancel();
                throw new Error(event.message);
            }
            if (payload.event === "step" && payload.step && payload.status) {
                handlers.onStep?.(
                    {
                        step: payload.step,
                        status: payload.status,
                        index: payload.index ?? 0,
                        total: payload.total ?? 0,
                    },
                    event.message,
                );
                if (payload.step === "SEARCH" && payload.status === "DONE" && payload.result) {
                    handlers.onSearchResult?.(payload.result);
                }
            } else if (payload.event === "delta" && payload.text) {
                handlers.onDelta?.(payload.text);
            } else if (payload.event === "complete") {
                void reader.cancel();
                return aiChatAnswerSchema.parse(payload);
            }
        }
        if (done) {
            break;
        }
    }
    throw new Error("답변을 다 받기 전에 연결이 끊겼어요. 대화를 다시 열어 확인해 주세요.");
};

const getChats = async (cursor?: string): Promise<AiChatPage> =>
    aiChatPageSchema.parse(
        unwrap(
            await api.get<ApiResponse<AiChatPage>>("/ai/chats", {
                params: cursor ? { cursor, size: 20 } : { size: 20 },
            }),
        ),
    );

const getSuggestions = async (size: number): Promise<AiChatSuggestion[]> =>
    aiChatSuggestionSchema.array().parse(
        unwrap(
            await api.get<ApiResponse<AiChatSuggestion[]>>("/ai/chats/suggestions", {
                params: { size },
            }),
        ),
    );

const getChat = async (chatId: number): Promise<AiChatDetail> =>
    aiChatDetailSchema.parse(
        unwrap(await api.get<ApiResponse<AiChatDetail>>(`/ai/chats/${chatId}/messages`)),
    );

const startChat = (message: string, handlers: AiChatStreamHandlers) =>
    streamAnswer("/ai/chats", { message }, handlers);

const askInChat = (chatId: number, message: string, handlers: AiChatStreamHandlers) =>
    streamAnswer(`/ai/chats/${chatId}/messages`, { message }, handlers);

/** 답변 다시 만들기(message 없음) 또는 질문 수정(message 있음) — 그 답변부터 뒤 대화는 새 답변으로 바뀐다. */
const regenerate = (
    chatId: number,
    answerId: number,
    message: string | undefined,
    handlers: AiChatStreamHandlers,
) =>
    streamAnswer(
        `/ai/chats/${chatId}/messages/${answerId}/regenerate`,
        message ? { message } : {},
        handlers,
    );

const deleteChat = async (chatId: number) =>
    unwrap(await api.delete<ApiResponse<null>>(`/ai/chats/${chatId}`));

const deleteAllChats = async () =>
    unwrap(await api.delete<ApiResponse<{ deletedCount: number }>>("/ai/chats"));

export const aiChatApi = {
    getChats,
    getSuggestions,
    getChat,
    startChat,
    askInChat,
    regenerate,
    deleteChat,
    deleteAllChats,
};
