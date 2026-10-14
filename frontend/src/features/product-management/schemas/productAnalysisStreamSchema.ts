import { z } from "zod";

import {
    analysisRecommendationSchema,
    analysisStatusSchema,
    productAnalysisResponseSchema,
} from "./productManagementResponseSchema";

export const productAnalysisStepSchema = z.enum([
    "CANDIDATE_SEARCH",
    "AI_ANALYSIS",
    "PRICE_CALCULATION",
    "FORECAST",
    "SAVE",
]);

export const productAnalysisStepStatusSchema = z.enum(["WAITING", "START", "DONE"]);

const productAnalysisStreamStepEventSchema = z.object({
    event: z.literal("step"),
    step: productAnalysisStepSchema,
    status: productAnalysisStepStatusSchema,
    index: z.number().int(),
    total: z.number().int(),
});

const productAnalysisStreamCompleteEventSchema = z
    .object({
        event: z.literal("complete"),
        productId: z.number(),
        analysisStatus: analysisStatusSchema,
        analysisId: z.number().nullable(),
        recommendation: analysisRecommendationSchema.nullable(),
    })
    .passthrough();

export const productAnalysisStreamEventSchema = z.object({
    success: z.boolean(),
    message: z.string(),
    data: z.discriminatedUnion("event", [
        productAnalysisStreamStepEventSchema,
        productAnalysisStreamCompleteEventSchema,
    ]),
    error: z
        .object({
            code: z.string().optional(),
            message: z.string().optional(),
        })
        .nullable(),
});

export type ProductAnalysisStep = z.infer<typeof productAnalysisStepSchema>;
export type ProductAnalysisStepStatus = z.infer<typeof productAnalysisStepStatusSchema>;
export type ProductAnalysisStreamStep = z.infer<typeof productAnalysisStreamStepEventSchema>;
export type ProductAnalysisStreamComplete = z.infer<
    typeof productAnalysisStreamCompleteEventSchema
>;
export type ProductAnalysisStreamEvent = z.infer<typeof productAnalysisStreamEventSchema>;

export type ProductAnalysisStreamResult = {
    analysisStatus: z.infer<typeof analysisStatusSchema>;
    analysis: z.infer<typeof productAnalysisResponseSchema> | null;
    message: string;
};
