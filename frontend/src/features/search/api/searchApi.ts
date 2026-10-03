import { api } from "@/common/lib/api/client";
import type { ApiResponse } from "@/common/lib/api/types";

import type { SearchParams, SearchResponse } from "../types";

const searchList = (params: SearchParams, signal?: AbortSignal) =>
    api.get<ApiResponse<SearchResponse>>("/products", { params, signal });

export const searchApi = {
    searchList,
};
