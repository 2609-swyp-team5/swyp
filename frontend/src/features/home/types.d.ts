import type { z } from "zod";
import type {
    popularProductsResponseSchema,
    homeSummaryResponseSchema,
} from "./schemas/homeResponseSchema";

export type PopularProductsResponse = z.infer<typeof popularProductsResponseSchema>;
export type HomeSummaryResponse = z.infer<typeof homeSummaryResponseSchema>;
