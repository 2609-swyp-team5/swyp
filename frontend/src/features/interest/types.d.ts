import type { z } from "zod";

import type { CursorPageResponse } from "@/common/lib/api/types";
import type { productRecommendationSchema } from "@/features/sell/schemas/productResponseSchema";
import type {
    interestCreateResponseSchema,
    interestListItemSchema,
    interestListResponseSchema,
    interestSourceSchema,
} from "./schemas/interestResponseSchema";

export type InterestSource = z.infer<typeof interestSourceSchema>;
export type InterestRecommendation = z.infer<typeof productRecommendationSchema>;

export type InterestListItem = z.infer<typeof interestListItemSchema>;

export type InterestListResponse = z.infer<typeof interestListResponseSchema>;

export interface InterestRegisterInput {
    source: InterestSource;
    targetId: number;
}

export type InterestTarget = InterestRegisterInput;
export type InterestItem = Pick<InterestListItem, "interestId" | "source" | "targetId">;
export type InterestsResponse = CursorPageResponse<InterestItem>;

export type InterestCreateResponse = z.infer<typeof interestCreateResponseSchema>;
