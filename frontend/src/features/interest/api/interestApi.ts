import { api } from "@/common/lib/api/client";
import type { ApiResponse } from "@/common/lib/api/types";

import type { InterestCreateResponse, InterestListResponse, InterestRegisterInput } from "../types";

const getInterests = (params?: { cursor?: string; size?: number }) =>
    api.get<ApiResponse<InterestListResponse>>("/interests", {
        params: {
            cursor: params?.cursor,
            size: params?.size ?? 20,
        },
    });

const registerInterest = (input: InterestRegisterInput) =>
    api.post<ApiResponse<InterestCreateResponse>>("/interests", input);

const deleteInterest = (interestId: number) =>
    api.delete<ApiResponse<null>>(`/interests/${interestId}`);

export const interestApi = {
    getInterests,
    registerInterest,
    deleteInterest,
};
