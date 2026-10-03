import { api } from "@/common/lib/api/client";
import type { ApiResponse } from "@/common/lib/api/types";

import type { SearchParams, SearchResponse, SearchProductDetail } from "../types";

const searchList = (params: SearchParams, signal?: AbortSignal) =>
    api.get<ApiResponse<SearchResponse>>("/products", {
        params,
        paramsSerializer: { indexes: null },
        signal,
    });

const searchProductDetail = (id: number, signal?: AbortSignal) =>
    api.get<ApiResponse<SearchProductDetail>>(`/products/${id}`, { signal });

export const searchApi = {
    searchList,
    searchProductDetail,
};
