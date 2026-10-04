import type { z } from "zod";

import type { popularProductsResponseSchema } from "./schemas/homeResponseSchema";

export type PopularProductsResponse = z.infer<typeof popularProductsResponseSchema>;
