import { api } from "@/common/lib/api/client";
import type { ApiResponse } from "@/common/lib/api/types";
import type {
    PopularProductsResponse,
    HomeSummaryResponse,
    InterestListResponse,
    InterestTarget,
    InterestCreateResponse,
} from "../types";

const popularProducts = (signal?: AbortSignal) =>
    api.get<ApiResponse<PopularProductsResponse>>("/products/popular", { signal });

const interestList = (params: { cursor?: string; size: number }, signal?: AbortSignal) =>
    api.get<ApiResponse<InterestListResponse>>("/interests", { params, signal });

const interestRegister = (target: InterestTarget) =>
    api.post<ApiResponse<InterestCreateResponse>>("/interests", target);

const interestDelete = (interestId: number) =>
    api.delete<ApiResponse<null>>(`/interests/${interestId}`);

const summary = (signal?: AbortSignal) =>
    api.get<ApiResponse<HomeSummaryResponse>>("/home/summary", { signal });

export const homeApi = { popularProducts, interestList, interestRegister, interestDelete, summary };
