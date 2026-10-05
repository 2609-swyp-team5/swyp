import { api } from "@/common/lib/api/client";
import type { ApiResponse } from "@/common/lib/api/types";

import type { AiSearchResponse, SearchParams, SearchResponse, SearchProductDetail } from "../types";
import type { InterestListResponse, InterestTarget, InterestCreateResponse } from "../types";
import { startFastNotificationPolling } from "@/features/notifications/lib/fastPolling";

const searchList = (params: SearchParams, signal?: AbortSignal) =>
    api.get<ApiResponse<SearchResponse>>("/products", {
        params,
        paramsSerializer: { indexes: null },
        signal,
    });

const searchProductDetail = (id: number, signal?: AbortSignal) =>
    api.get<ApiResponse<SearchProductDetail>>(`/products/${id}`, { signal });

const interestList = (params: { cursor?: string; size: number }, signal?: AbortSignal) =>
    api.get<ApiResponse<InterestListResponse>>("/interests", { params, signal });

// 등록 직후 분석이 돌아 추천 알림이 곧 올 수 있어 토스트 조회를 잠시 앞당긴다
const interestRegister = async (target: InterestTarget) => {
    const response = await api.post<ApiResponse<InterestCreateResponse>>("/interests", target);
    startFastNotificationPolling();
    return response;
};

const interestDelete = (interestId: number) =>
    api.delete<ApiResponse<null>>(`/interests/${interestId}`);

export const searchApi = {
    interestList,
    interestRegister,
    interestDelete,
    aiSearch: (query: string) =>
        api.get<ApiResponse<AiSearchResponse>>("/products/analysis/search", {
            params: { query, size: 20 },
            timeout: 60000,
        }),
    searchList,
    searchProductDetail,
};
