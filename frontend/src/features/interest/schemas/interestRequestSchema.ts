import { z } from "zod";

import { interestSourceSchema } from "./interestSchema";

export const interestRegisterInputSchema = z.object({
    source: interestSourceSchema,
    targetId: z.number().int().positive(),
});
