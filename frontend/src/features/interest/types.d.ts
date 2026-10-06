import type { z } from "zod";

import type {
    interestRecommendationSchema,
    interestSourceSchema,
    interestStatusSchema,
} from "./schemas/interestSchema";
import type { interestRegisterInputSchema } from "./schemas/interestRequestSchema";
import type {
    interestCreateResponseSchema,
    interestListItemSchema,
    interestListResponseSchema,
    interestTargetPriceResponseSchema,
} from "./schemas/interestResponseSchema";

export type InterestSource = z.infer<typeof interestSourceSchema>;
export type InterestRecommendation = z.infer<typeof interestRecommendationSchema>;
export type InterestStatus = z.infer<typeof interestStatusSchema>;

export type InterestListItem = z.infer<typeof interestListItemSchema>;
export type InterestListResponse = z.infer<typeof interestListResponseSchema>;
export type InterestRegisterInput = z.infer<typeof interestRegisterInputSchema>;
export type InterestCreateResponse = z.infer<typeof interestCreateResponseSchema>;
export type InterestTargetPriceResponse = z.infer<typeof interestTargetPriceResponseSchema>;
