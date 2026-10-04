import { z } from "zod";

import { productSummaryResponseSchema } from "@/features/sell/schemas/productResponseSchema";

export const myProductSchema = productSummaryResponseSchema.extend({
    platformName: z.string().nullable(),
});

export const myPlatformTypeSchema = z.enum(["BUNJANG"]);
export const myPlatformStatusSchema = z.enum(["CONNECTED", "EXPIRED", "DISCONNECTED"]);

export const myPlatformConnectionStateSchema = z.object({
    status: myPlatformStatusSchema,
    updatedAt: z.string().nullable(),
});

export const myPlatformConnectionSchema = myPlatformConnectionStateSchema.extend({
    platform: myPlatformTypeSchema,
    platformName: z.string(),
});
