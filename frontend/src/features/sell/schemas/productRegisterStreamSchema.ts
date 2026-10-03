import { z } from "zod";

import { productResponseSchema } from "./productResponseSchema";

export const productRegisterStepSchema = z.enum(["IMAGE_UPLOAD", "IMAGE_ANALYSIS", "PRODUCT_SAVE"]);

export const productRegisterStepStatusSchema = z.enum(["START", "DONE", "SKIP"]);

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
export type ProductRegisterStreamEvent = z.infer<typeof productRegisterStreamEventSchema>;
