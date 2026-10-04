import { z } from "zod";

export const interestItemSchema = z.object({
    interestId: z.number(),
    source: z.enum(["OUR", "EXTERNAL"]),
    targetId: z.number(),
});

export const interestListResponseSchema = z.object({
    content: z.array(interestItemSchema),
    nextCursor: z.string().nullable(),
    hasNext: z.boolean(),
});

export const interestTargetSchema = interestItemSchema.omit({ interestId: true });

export const interestCreateResponseSchema = z.object({
    interestId: z.number(),
});
