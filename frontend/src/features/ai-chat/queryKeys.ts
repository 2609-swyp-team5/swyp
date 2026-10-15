export const aiChatsQueryKey = ["ai-chats"] as const;
export const aiChatQueryKey = (chatId: number | null) => ["ai-chat", chatId] as const;
export const aiChatSuggestionsQueryKey = ["ai-chat-suggestions"] as const;
export const aiTimingAlertsQueryKey = ["ai-timing-alerts"] as const;
export const aiChatCardAnalysisQueryKey = (productId: number, perspective: "SELL" | "BUY") =>
    ["ai-chat-card-analysis", productId, perspective] as const;
