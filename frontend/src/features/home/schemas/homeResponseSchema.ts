import { z } from "zod";

import { productSummaryResponseSchema } from "@/features/sell/schemas/productResponseSchema";

export const popularProductsResponseSchema = z.array(productSummaryResponseSchema);
