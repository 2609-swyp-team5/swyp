"use client";

import { SquarePen, Trash2 } from "lucide-react";
import { useState } from "react";

import { getApiErrorMessage } from "@/common/lib/api/error";
import { cn } from "@/common/lib/utils";
import { SellAlertDialog } from "@/features/sell/components/shared/SellAlertDialog";

import {
    useDeleteAiChatMutation,
    useDeleteAllAiChatsMutation,
} from "../hooks/mutations/useDeleteAiChatMutation";
import { useAiChatsQuery } from "../hooks/queries/useAiChatsQuery";
import { formatChatTime } from "../utils/aiChatDisplay";

/** 최근 대화 목록 — 대화 열기, 새 대화, 대화 하나·전체 삭제. */
export function AiChatSidebar({
    activeChatId,
    onSelect,
    onNewChat,
    onDeleted,
    className,
}: {
    activeChatId: number | null;
    onSelect: (chatId: number) => void;
    onNewChat: () => void;
    /** 지운 대화(전체 삭제면 null)가 열려 있던 대화면 화면을 비운다 */
    onDeleted: (chatId: number | null) => void;
    className?: string;
}) {
    const chats = useAiChatsQuery();
    const remove = useDeleteAiChatMutation();
    const removeAll = useDeleteAllAiChatsMutation();
    const [isDeleteAllOpen, setIsDeleteAllOpen] = useState(false);
    const chatList = chats.data?.pages.flatMap((page) => page.content) ?? [];
    const totalCount = chats.data?.pages[0]?.totalCount ?? chatList.length;
    const error = remove.error ?? removeAll.error;

    return (
        <aside
            aria-label="최근 대화 목록"
            className={cn("flex flex-col bg-white px-5 py-6 md:px-[30px] md:py-[50px]", className)}
        >
            <div className="flex flex-col gap-2.5 pb-5 md:pb-[50px]">
                <div className="flex items-center justify-between">
                    <p className="typography-body-medium text-[#464646]">전체 {totalCount}</p>
                    <button
                        type="button"
                        onClick={onNewChat}
                        className="typography-body-bold-small flex items-center gap-1 text-[#6653fb]"
                    >
                        <SquarePen aria-hidden="true" className="size-4" />
                        새로운 채팅
                    </button>
                </div>
                <div className="flex items-end justify-between">
                    <h2 className="typography-heading-bold text-[#464646]">최근 대화 목록</h2>
                    {totalCount > 0 ? (
                        <button
                            type="button"
                            disabled={removeAll.isPending}
                            onClick={() => setIsDeleteAllOpen(true)}
                            className="typography-body-small text-[#a9adbd] hover:text-[#fa503d] disabled:opacity-40"
                        >
                            {removeAll.isPending ? "지우는 중…" : "전체 삭제"}
                        </button>
                    ) : null}
                </div>
                {error ? (
                    <p role="alert" className="typography-body-small text-[#fa503d]">
                        {getApiErrorMessage(error)}
                    </p>
                ) : null}
            </div>
            <ul className="flex flex-col gap-1 md:gap-3">
                {chats.isPending ? (
                    <li role="status" className="typography-body-small p-2.5 text-[#a9adbd]">
                        대화 목록을 불러오는 중이에요.
                    </li>
                ) : chats.isError ? (
                    <li role="alert" className="typography-body-small p-2.5 text-[#fa503d]">
                        {getApiErrorMessage(chats.error)}
                    </li>
                ) : chatList.length === 0 ? (
                    <li className="typography-body-small p-2.5 text-[#a9adbd]">
                        아직 대화가 없어요.
                    </li>
                ) : null}
                {chatList.map((chat) => (
                    <li key={chat.chatId} className="group flex items-center gap-1">
                        <button
                            type="button"
                            aria-current={chat.chatId === activeChatId ? "true" : undefined}
                            onClick={() => onSelect(chat.chatId)}
                            className={cn(
                                "flex min-w-0 flex-1 items-center justify-between gap-3 rounded-md p-2.5 text-left",
                                chat.chatId === activeChatId
                                    ? "bg-[#f1f1f1]"
                                    : "hover:bg-[#fafbff]",
                            )}
                        >
                            <span className="typography-body-medium truncate text-[#545d82]">
                                {chat.title}
                            </span>
                            <span className="typography-caption shrink-0 text-[#a9adbd]">
                                {formatChatTime(chat.updatedAt)}
                            </span>
                        </button>
                        <button
                            type="button"
                            aria-label={`${chat.title} 대화 삭제`}
                            disabled={remove.isPending}
                            onClick={() =>
                                remove.mutate(chat.chatId, {
                                    onSuccess: () => onDeleted(chat.chatId),
                                })
                            }
                            className="flex size-8 shrink-0 items-center justify-center rounded-md text-[#a9adbd] hover:text-[#fa503d] md:opacity-0 md:group-focus-within:opacity-100 md:group-hover:opacity-100"
                        >
                            <Trash2 aria-hidden="true" className="size-4" />
                        </button>
                    </li>
                ))}
                {chats.hasNextPage ? (
                    <li>
                        <button
                            type="button"
                            disabled={chats.isFetchingNextPage}
                            onClick={() => void chats.fetchNextPage()}
                            className="typography-body-bold-small p-2.5 text-[#6653fb]"
                        >
                            {chats.isFetchingNextPage ? "불러오는 중…" : "더 불러오기"}
                        </button>
                    </li>
                ) : null}
            </ul>
            <SellAlertDialog
                open={isDeleteAllOpen}
                onClose={() => setIsDeleteAllOpen(false)}
                onConfirm={() => {
                    setIsDeleteAllOpen(false);
                    removeAll.mutate(undefined, { onSuccess: () => onDeleted(null) });
                }}
                title="대화를 모두 지울까요?"
                description={`대화 ${totalCount}개가 모두 지워지고 되돌릴 수 없어요.`}
                confirmLabel="모두 지우기"
                cancelLabel="취소"
            />
        </aside>
    );
}
