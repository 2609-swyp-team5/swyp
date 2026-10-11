import { api } from "@/common/lib/api/client";
import type { ApiResponse } from "@/common/lib/api/types";
import type { PopularProductsResponse, HomeSummaryResponse } from "../types";

const popularProducts = (signal?: AbortSignal) =>
    api.get<ApiResponse<PopularProductsResponse>>("/products/popular", { signal });

const summary = (signal?: AbortSignal) =>
    api.get<ApiResponse<HomeSummaryResponse>>("/home/summary", { signal });

export const homeApi = { popularProducts, summary };
