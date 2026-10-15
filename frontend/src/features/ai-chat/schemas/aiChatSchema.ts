import { z } from "zod";

export const aiChatIntentSchema = z.enum(["SELL", "BUY", "PRICE", "UNKNOWN"]);
export const aiChatRecommendationSchema = z.enum(["SELL", "HOLD", "BUY", "WAIT"]);
export const aiChatAnalysisStatusSchema = z.enum([
    "ANALYZED",
    "ANALYZING",
    "SKIPPED",
    "NOT_ANALYZED",
    "UNAVAILABLE",
]);
const listingSourceSchema = z.enum(["OUR", "EXTERNAL"]);

/** "상세 시세 분석 보기" 카드 — 질문이 가리킨 상품의 최근 시세 판단(분석 전이면 recommendation null). */
export const aiChatAnalysisCardSchema = z.object({
    productId: z.number(),
    source: listingSourceSchema,
    mine: z.boolean(),
    title: z.string(),
    price: z.number(),
    recommendation: aiChatRecommendationSchema.nullable(),
    reason: z.string(),
    averagePrice: z.number().nullable(),
    analysisStatus: aiChatAnalysisStatusSchema,
});

export const aiChatRecommendedProductSchema = z.object({
    id: z.number(),
    source: listingSourceSchema,
    platformName: z.string(),
    imageUrl: z.string().nullable(),
    title: z.string(),
    price: z.number(),
    averagePrice: z.number().nullable(),
    priceDiffRate: z.number().nullable(),
    externalUrl: z.string().nullable(),
});

export const aiChatMessageSchema = z.object({
    messageId: z.number(),
    role: z.enum(["USER", "ASSISTANT"]),
    content: z.string(),
    intent: aiChatIntentSchema.nullable(),
    analysis: aiChatAnalysisCardSchema.nullable(),
    recommendedProducts: z.array(aiChatRecommendedProductSchema),
    createdAt: z.string(),
});

export const aiChatSummarySchema = z.object({
    chatId: z.number(),
    title: z.string(),
    createdAt: z.string(),
    updatedAt: z.string(),
});

export const aiChatPageSchema = z.object({
    content: z.array(aiChatSummarySchema),
    nextCursor: z.string().nullable(),
    hasNext: z.boolean(),
    totalCount: z.number().nullable().optional(),
});

export const aiChatDetailSchema = z.object({
    chatId: z.number(),
    title: z.string(),
    messages: z.array(aiChatMessageSchema),
});

export const aiChatSuggestionSchema = z.object({
    question: z.string(),
    intent: aiChatIntentSchema,
    keyword: z.string(),
    source: z.enum(["MY_PRODUCT", "INTEREST", "TRENDING", "DEFAULT"]),
});

export const aiChatAnswerSchema = z.object({
    chatId: z.number(),
    title: z.string(),
    question: aiChatMessageSchema,
    answer: aiChatMessageSchema,
});

/** 답변 스트림의 SEARCH 단계 결과 — 답변 문장보다 먼저 카드를 그릴 수 있게 온다. */
export const aiChatSearchResultSchema = z.object({
    intent: aiChatIntentSchema,
    analysis: aiChatAnalysisCardSchema.nullable(),
    recommendedProducts: z.array(aiChatRecommendedProductSchema),
});

export const aiChatStepSchema = z.enum(["INTERPRET", "SEARCH", "WRITE"]);

export const aiChatStreamEventSchema = z.object({
    success: z.boolean(),
    message: z.string(),
    data: z
        .object({
            event: z.enum(["step", "delta", "complete", "error"]),
            step: aiChatStepSchema.nullable().optional(),
            status: z.enum(["START", "DONE", "SKIP"]).optional(),
            index: z.number().optional(),
            total: z.number().optional(),
            result: aiChatSearchResultSchema.nullable().optional(),
            text: z.string().optional(),
        })
        .passthrough()
        .nullable(),
});

export type AiChatRecommendation = z.infer<typeof aiChatRecommendationSchema>;
export type AiChatAnalysisCard = z.infer<typeof aiChatAnalysisCardSchema>;
export type AiChatRecommendedProduct = z.infer<typeof aiChatRecommendedProductSchema>;
export type AiChatMessage = z.infer<typeof aiChatMessageSchema>;
export type AiChatSummary = z.infer<typeof aiChatSummarySchema>;
export type AiChatPage = z.infer<typeof aiChatPageSchema>;
export type AiChatDetail = z.infer<typeof aiChatDetailSchema>;
export type AiChatSuggestion = z.infer<typeof aiChatSuggestionSchema>;
export type AiChatAnswer = z.infer<typeof aiChatAnswerSchema>;
export type AiChatSearchResult = z.infer<typeof aiChatSearchResultSchema>;
export type AiChatStep = z.infer<typeof aiChatStepSchema>;
