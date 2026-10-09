import { z } from "zod";

import { productSummaryResponseSchema } from "@/features/sell/schemas/productResponseSchema";

export const myProductSchema = productSummaryResponseSchema.extend({
    platformName: z.string().nullable(),
});

export const myPlatformTypeSchema = z.enum(["BUNJANG"]);
export const myPlatformStatusSchema = z.enum(["CONNECTED", "EXPIRED", "DISCONNECTED"]);

export const bunjangCarrierSchema = z.enum([
    "SKT",
    "KT",
    "LG_U_PLUS",
    "SKT_MVNO",
    "KT_MVNO",
    "LG_U_PLUS_MVNO",
]);

export const myPlatformConnectionStateSchema = z.object({
    status: myPlatformStatusSchema,
    updatedAt: z.string().nullable(),
});

export const myPlatformConnectionSchema = myPlatformConnectionStateSchema.extend({
    platform: myPlatformTypeSchema,
    platformName: z.string(),
});

export const bunjangVerificationResponseSchema = z.object({
    verificationId: z.string(),
    expiresInSeconds: z.number().int().positive(),
});

export const bunjangVerificationConfirmResponseSchema = z.object({
    status: myPlatformStatusSchema,
    updatedAt: z.string().nullable(),
    newBunjangAccount: z.boolean(),
});
