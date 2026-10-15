"use client";

import { ArrowLeft, MessagesSquare, Sparkles } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { getApiErrorMessage } from "@/common/lib/api/error";
import { cn } from "@/common/lib/utils";

import { useSendAiChatMutation } from "../hooks/mutations/useSendAiChatMutation";
import { useAiChatQuery } from "../hooks/queries/useAiChatQuery";
import { useAiChatsQuery } from "../hooks/queries/useAiChatsQuery";
import { AiChatHome } from "./AiChatHome";
import { AiChatInput } from "./AiChatInput";
import { AssistantBubble, StreamingBubble, UserBubble } from "./AiChatMessages";
import { AiChatSidebar } from "./AiChatSidebar";
import { AiChatSuggestionChips } from "./AiChatSuggestionChips";

/** 보내는 중인 요청 — 질문을 먼저 보여 주고, 다시 만들기면 그 답변부터 가린다. */
type Sending = { question: string; fromAnswerId: number | null };

/**
 * 지금이니 AI — 첫 화면(질문·추천 질문·타이밍 알림)과 대화 화면(최근 대화 목록 + 질문·답변).
 * 답변은 스트림으로 받아 진행 단계 → 분석 카드·추천 상품 → 문장 순으로 그린다.
 * `/ai?q=질문`으로 들어오면(홈 AI 검색) 그 질문으로 새 대화를 바로 시작한다.
 */
export function AiChatPage() {
    const [activeChatId, setActiveChatId] = useState<number | null>(null);
    const [isWorkspaceOpen, setIsWorkspaceOpen] = useState(false);
    const [isMobileListOpen, setIsMobileListOpen] = useState(false);
    const [draft, setDraft] = useState("");
    const [editingAnswerId, setEditingAnswerId] = useState<number | null>(null);
    const [sending, setSending] = useState<Sending | null>(null);

    const chats = useAiChatsQuery();
    const chatCount =
        chats.data?.pages[0]?.totalCount ??
        chats.data?.pages.reduce((count, page) => count + page.content.length, 0) ??
        0;
    const detail = useAiChatQuery(activeChatId);
    const send = useSendAiChatMutation((chatId) => setActiveChatId(chatId));

    const submit = (question: string, answerId: number | null = null) => {
        const text = question.trim();
        if (send.isPending || (!text && answerId === null)) {
            return;
        }
        setSending({ question: text, fromAnswerId: answerId });
        setIsWorkspaceOpen(true);
        setIsMobileListOpen(false);
        setDraft("");
        setEditingAnswerId(null);
        send.mutate(
            { chatId: activeChatId, question: text, answerId },
            { onSettled: () => setSending(null) },
        );
    };

    // 주소의 첫 질문은 한 번만 보내고, 새로고침해도 다시 보내지 않도록 주소에서 지운다
    const router = useRouter();
    const initialQuestion = useSearchParams().get("q")?.trim() ?? "";
    const initialQuestionSent = useRef(false);
    useEffect(() => {
        if (!initialQuestion || initialQuestionSent.current) {
            return;
        }
        initialQuestionSent.current = true;
        router.replace("/ai");
        submit(initialQuestion);
        // eslint-disable-next-line react-hooks/exhaustive-deps -- 첫 진입 때 한 번만
    }, [initialQuestion]);

    const openChat = (chatId: number) => {
        setActiveChatId(chatId);
        setEditingAnswerId(null);
        setIsMobileListOpen(false);
        setIsWorkspaceOpen(true);
    };

    const startNewChat = () => {
        setActiveChatId(null);
        setEditingAnswerId(null);
        setDraft("");
        setIsMobileListOpen(false);
        setIsWorkspaceOpen(false);
    };

    if (activeChatId === null && !isWorkspaceOpen && !sending) {
        return (
            <AiChatHome
                chatCount={chatCount}
                onAsk={(question) => submit(question)}
                onOpenList={() => {
                    setIsWorkspaceOpen(true);
                    setIsMobileListOpen(true);
                }}
            />
        );
    }

    const messages = detail.data?.messages ?? [];
    // 다시 만들기 중이면 그 답변부터 숨기고, 질문 수정이면 바로 앞 질문도 고친 내용으로 보여 준다
    const cutIndex = sending?.fromAnswerId
        ? messages.findIndex((message) => message.messageId === sending.fromAnswerId)
        : -1;
    const shown = cutIndex >= 0 ? messages.slice(0, cutIndex) : messages;
    const pendingQuestion =
        sending && (sending.fromAnswerId === null || sending.question) ? sending.question : null;
    const visible =
        cutIndex >= 0 && pendingQuestion && shown.length > 0 ? shown.slice(0, -1) : shown;

    return (
        <main className="flex flex-1 flex-col bg-[#fafbff] lg:flex-row">
            <AiChatSidebar
                activeChatId={activeChatId}
                onSelect={openChat}
                onNewChat={startNewChat}
                onDeleted={(chatId) => {
                    if (chatId === null || chatId === activeChatId) {
                        startNewChat();
                    }
                }}
                className={cn(
                    "lg:flex lg:w-[360px] lg:shrink-0 lg:border-r lg:border-[#eef0f5] xl:w-[400px]",
                    isMobileListOpen ? "flex flex-1" : "hidden",
                )}
            />

            <section
                aria-labelledby="ai-chat-title"
                className={cn(
                    "min-w-0 flex-1 flex-col gap-6 px-5 pt-6 pb-4 md:gap-[50px] md:px-8 md:pt-[60px] lg:px-[30px] lg:pt-[100px]",
                    isMobileListOpen ? "hidden lg:flex" : "flex",
                )}
            >
                <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            aria-label="지금이니 AI 첫 화면으로"
                            onClick={startNewChat}
                            className="flex size-9 items-center justify-center rounded-full text-[#545d82] hover:bg-white lg:hidden"
                        >
                            <ArrowLeft aria-hidden="true" className="size-5" />
                        </button>
                        <Sparkles
                            aria-hidden="true"
                            className="hidden size-7 text-[#6653fb] md:block"
                        />
                        <h1 id="ai-chat-title" className="typography-heading-01 text-[#6653fb]">
                            지금이니 AI
                        </h1>
                    </div>
                    <button
                        type="button"
                        onClick={() => setIsMobileListOpen(true)}
                        className="typography-body-bold-small flex items-center gap-1.5 rounded-full border border-[#d3d3d3] bg-white px-3 py-2 text-[#545d82] lg:hidden"
                    >
                        <MessagesSquare aria-hidden="true" className="size-4" />
                        대화 목록
                    </button>
                </div>

                <div className="flex flex-1 flex-col gap-6 md:gap-[50px]">
                    {activeChatId !== null && detail.isPending ? (
                        <p role="status" className="typography-body-medium text-[#83889e]">
                            대화를 불러오는 중이에요.
                        </p>
                    ) : detail.isError ? (
                        <p role="alert" className="typography-body-medium text-[#fa503d]">
                            {getApiErrorMessage(detail.error)}
                        </p>
                    ) : activeChatId === null && !sending ? (
                        <div className="flex flex-col gap-4">
                            <p className="typography-body-medium text-[#83889e]">
                                대화를 고르거나 아래에 질문을 입력해 주세요.
                            </p>
                            <AiChatSuggestionChips
                                onAsk={(question) => submit(question)}
                                align="start"
                            />
                        </div>
                    ) : null}
                    {visible.map((message, index) =>
                        message.role === "USER" ? (
                            <UserBubble key={message.messageId} text={message.content} />
                        ) : (
                            <AssistantBubble
                                key={message.messageId}
                                message={message}
                                disabled={send.isPending}
                                editing={editingAnswerId === message.messageId}
                                onRegenerate={() => submit("", message.messageId)}
                                onEdit={() => {
                                    setEditingAnswerId(message.messageId);
                                    setDraft(visible[index - 1]?.content ?? "");
                                }}
                            />
                        ),
                    )}
                    {sending ? (
                        <>
                            {pendingQuestion ? <UserBubble text={pendingQuestion} /> : null}
                            <StreamingBubble live={send.live} />
                        </>
                    ) : null}
                    {send.isError ? (
                        <p role="alert" className="typography-body-small text-[#fa503d]">
                            답변을 받지 못했어요. {getApiErrorMessage(send.error)}
                        </p>
                    ) : null}
                </div>

                <div className="flex flex-col gap-2">
                    {editingAnswerId !== null ? (
                        <p className="typography-body-small text-[#6653fb]">
                            질문을 고친 뒤 보내면 그 답변부터 다시 만들어요.{" "}
                            <button
                                type="button"
                                className="underline"
                                onClick={() => {
                                    setEditingAnswerId(null);
                                    setDraft("");
                                }}
                            >
                                취소
                            </button>
                        </p>
                    ) : null}
                    <AiChatInput
                        value={draft}
                        onChange={setDraft}
                        disabled={send.isPending}
                        onSubmit={() => submit(draft, editingAnswerId)}
                    />
                </div>
            </section>
        </main>
    );
}
