import { beforeEach, describe, expect, it, vi } from "vitest";

const { fetchMock, get } = vi.hoisted(() => ({ fetchMock: vi.fn(), get: vi.fn() }));

vi.mock("@/common/lib/api/client", () => ({
    api: { get, post: vi.fn(), delete: vi.fn(), defaults: { baseURL: "https://api.test" } },
}));

import { aiChatApi } from "./aiChatApi";

const sseResponse = (...events: unknown[]) => {
    const body = new TextEncoder().encode(
        events.map((event) => `data:${JSON.stringify(event)}\n\n`).join(""),
    );
    return {
        ok: true,
        status: 200,
        body: {
            getReader: () => {
                let delivered = false;
                return {
                    read: async () => {
                        if (delivered) return { done: true, value: undefined };
                        delivered = true;
                        return { done: false, value: body };
                    },
                    cancel: async () => undefined,
                };
            },
        },
    } as unknown as Response;
};

const message = (messageId: number, role: "USER" | "ASSISTANT", content: string) => ({
    messageId,
    role,
    content,
    intent: role === "USER" ? null : "SELL",
    analysis: null,
    recommendedProducts: [],
    createdAt: "2026-10-15T10:00:00",
});

const card = {
    productId: 7,
    source: "OUR",
    mine: true,
    title: "아이폰 16",
    price: 1050000,
    recommendation: "SELL",
    reason: "추세가 뚜렷하지 않아요.",
    averagePrice: 936667,
    analysisStatus: "ANALYZED",
};

describe("aiChatApi", () => {
    beforeEach(() => {
        fetchMock.mockReset();
        vi.stubGlobal("fetch", fetchMock);
    });

    it("streams steps, the search result and text pieces, then returns the saved answer", async () => {
        fetchMock.mockResolvedValue(
            sseResponse(
                {
                    success: true,
                    message: "질문을 이해하고 있어요.",
                    data: { event: "step", step: "INTERPRET", status: "START", index: 1, total: 3 },
                },
                {
                    success: true,
                    message: "매물과 시세를 찾았어요.",
                    data: {
                        event: "step",
                        step: "SEARCH",
                        status: "DONE",
                        index: 2,
                        total: 3,
                        result: { intent: "SELL", analysis: card, recommendedProducts: [] },
                    },
                },
                { success: true, message: "", data: { event: "delta", text: "지금 " } },
                { success: true, message: "", data: { event: "delta", text: "팔기 좋아요." } },
                {
                    success: true,
                    message: "",
                    data: {
                        event: "complete",
                        chatId: 3,
                        title: "아이폰 16 지금 팔아도 될까?",
                        question: message(10, "USER", "아이폰 16 지금 팔아도 될까?"),
                        answer: message(11, "ASSISTANT", "지금 팔기 좋아요."),
                    },
                },
            ),
        );
        const onStep = vi.fn();
        const onSearchResult = vi.fn();
        const pieces: string[] = [];

        const answer = await aiChatApi.startChat("아이폰 16 지금 팔아도 될까?", {
            onStep,
            onSearchResult,
            onDelta: (text) => pieces.push(text),
        });

        expect(answer).toMatchObject({ chatId: 3, answer: { messageId: 11 } });
        expect(onStep).toHaveBeenCalledWith(
            { step: "INTERPRET", status: "START", index: 1, total: 3 },
            "질문을 이해하고 있어요.",
        );
        expect(onSearchResult).toHaveBeenCalledWith({
            intent: "SELL",
            analysis: card,
            recommendedProducts: [],
        });
        expect(pieces.join("")).toBe("지금 팔기 좋아요.");
        const [url, request] = fetchMock.mock.calls[0] as [string, RequestInit];
        expect(url).toBe("https://api.test/ai/chats");
        expect((request.headers as Headers).get("Accept")).toBe("text/event-stream");
        expect(request.body).toBe(JSON.stringify({ message: "아이폰 16 지금 팔아도 될까?" }));
    });

    it("sends only the edited question when regenerating an answer", async () => {
        fetchMock.mockResolvedValue(
            sseResponse({
                success: true,
                message: "",
                data: {
                    event: "complete",
                    chatId: 3,
                    title: "t",
                    question: message(12, "USER", "q"),
                    answer: message(13, "ASSISTANT", "a"),
                },
            }),
        );

        await aiChatApi.regenerate(3, 11, undefined, {});
        await aiChatApi.regenerate(3, 11, "아이폰 16 프로는?", {});

        expect(fetchMock.mock.calls[0][0]).toBe(
            "https://api.test/ai/chats/3/messages/11/regenerate",
        );
        expect((fetchMock.mock.calls[0][1] as RequestInit).body).toBe("{}");
        expect((fetchMock.mock.calls[1][1] as RequestInit).body).toBe(
            JSON.stringify({ message: "아이폰 16 프로는?" }),
        );
    });

    it("fails with the server message on an error event or a JSON error before the stream", async () => {
        fetchMock.mockResolvedValueOnce(
            sseResponse({
                success: false,
                message: "답변을 만들지 못했어요.",
                data: { event: "error", step: "WRITE" },
            }),
        );
        await expect(aiChatApi.askInChat(3, "질문", {})).rejects.toThrow("답변을 만들지 못했어요.");

        fetchMock.mockResolvedValueOnce({
            ok: false,
            status: 503,
            body: null,
            json: async () => ({
                success: false,
                message: "지금은 답변 요청이 많아요.",
                data: null,
            }),
        } as unknown as Response);
        await expect(aiChatApi.startChat("질문", {})).rejects.toThrow("지금은 답변 요청이 많아요.");
    });

    it("fails when the stream ends before the answer is complete", async () => {
        fetchMock.mockResolvedValue(
            sseResponse({ success: true, message: "", data: { event: "delta", text: "지금" } }),
        );
        await expect(aiChatApi.startChat("질문", {})).rejects.toThrow("연결이 끊겼어요");
    });
});
