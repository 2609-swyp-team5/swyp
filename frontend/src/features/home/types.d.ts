import type { z } from "zod";
import type {
    interestItemSchema,
    interestListResponseSchema,
    interestTargetSchema,
    interestCreateResponseSchema,
} from "./schemas/interestResponseSchema";

export type InterestItem = z.infer<typeof interestItemSchema>;
export type InterestListResponse = z.infer<typeof interestListResponseSchema>;
export type InterestTarget = z.infer<typeof interestTargetSchema>;
export type InterestCreateResponse = z.infer<typeof interestCreateResponseSchema>;

import type {
    popularProductsResponseSchema,
    homeSummaryResponseSchema,
} from "./schemas/homeResponseSchema";

export type PopularProductsResponse = z.infer<typeof popularProductsResponseSchema>;
export type HomeSummaryResponse = z.infer<typeof homeSummaryResponseSchema>;
