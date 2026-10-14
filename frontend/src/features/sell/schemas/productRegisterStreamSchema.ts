import { z } from "zod";

import { productResponseSchema } from "./productResponseSchema";

// MARKET_ANALYSIS는 등록 요청에 withMarketAnalysis=true일 때만 PRODUCT_SAVE 뒤에 온다
export const productRegisterStepSchema = z.enum([
    "IMAGE_UPLOAD",
    "IMAGE_ANALYSIS",
    "PRODUCT_SAVE",
    "MARKET_ANALYSIS",
]);

// PROGRESS는 시세 분석 단계 안의 세부 진행(result = 세부 단계)
export const productRegisterStepStatusSchema = z.enum(["START", "PROGRESS", "DONE", "SKIP"]);

// 시세 분석 세부 단계(MARKET_ANALYSIS PROGRESS의 result — GET /products/{id}/analysis/stream의 step과 같은 값)
export const marketAnalysisSubStepSchema = z.enum([
    "CANDIDATE_SEARCH",
    "AI_ANALYSIS",
    "PRICE_CALCULATION",
    "FORECAST",
    "SAVE",
]);

export const marketAnalysisProgressSchema = z.object({
    step: marketAnalysisSubStepSchema,
    status: z.enum(["WAITING", "START", "DONE"]),
    index: z.number().int(),
    total: z.number().int(),
});

const productRegisterStepEventSchema = z.object({
    event: z.literal("step"),
    step: productRegisterStepSchema,
    status: productRegisterStepStatusSchema,
    index: z.number().int(),
    total: z.number().int(),
    result: z.unknown(),
});

const productRegisterCompleteEventSchema = productResponseSchema.extend({
    event: z.literal("complete"),
    analysis: z.unknown().optional(),
    // 시세 분석 결과(GET /products/{id}/analysis와 같은 필드) — withMarketAnalysis=true일 때만, 저장돼 있어 화면은 분석 조회로 다시 받는다
    marketAnalysis: z.unknown().nullable().optional(),
});

const productRegisterErrorEventSchema = z.object({
    event: z.literal("error"),
    step: productRegisterStepSchema.nullable(),
});

export const productRegisterStreamEventSchema = z.object({
    success: z.boolean(),
    message: z.string(),
    data: z.discriminatedUnion("event", [
        productRegisterStepEventSchema,
        productRegisterCompleteEventSchema,
        productRegisterErrorEventSchema,
    ]),
    error: z
        .object({
            code: z.string().optional(),
            message: z.string().optional(),
        })
        .nullable(),
});

export type ProductRegisterStep = z.infer<typeof productRegisterStepSchema>;
export type ProductRegisterStepStatus = z.infer<typeof productRegisterStepStatusSchema>;
export type MarketAnalysisSubStep = z.infer<typeof marketAnalysisSubStepSchema>;
export type MarketAnalysisProgress = z.infer<typeof marketAnalysisProgressSchema>;
export type ProductRegisterStreamEvent = z.infer<typeof productRegisterStreamEventSchema>;
