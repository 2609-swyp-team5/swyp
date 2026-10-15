"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { aiChatApi } from "../../api/aiChatApi";
import { aiChatsQueryKey } from "../../queryKeys";

export function useDeleteAiChatMutation() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (chatId: number) => aiChatApi.deleteChat(chatId),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: aiChatsQueryKey }),
    });
}

export function useDeleteAllAiChatsMutation() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: () => aiChatApi.deleteAllChats(),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: aiChatsQueryKey }),
    });
}
