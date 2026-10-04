import { api } from "@/common/lib/api/client";
import type { ApiResponse } from "@/common/lib/api/types";
import type { PopularProductsResponse } from "../types";

const popularProducts = (signal?: AbortSignal) =>
    api.get<ApiResponse<PopularProductsResponse>>("/products/popular", { signal });

export const homeApi = { popularProducts };
