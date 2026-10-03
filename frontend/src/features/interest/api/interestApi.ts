import { api } from "@/common/lib/api/client";
import type { ApiResponse } from "@/common/lib/api/types";
import type { InterestTarget, InterestsResponse } from "../types";

const interestList = (cursor?: string, signal?: AbortSignal) =>
    api.get<ApiResponse<InterestsResponse>>("/interests", {
        params: { cursor, size: 100 },
        signal,
    });

const interestRegister = (params: InterestTarget) =>
    api.post<ApiResponse<{ interestId: number }>>("/interests", params);

const interestDelete = (interestId: number) =>
    api.delete<ApiResponse<null>>(`/interests/${interestId}`);

export const interestApi = { interestList, interestRegister, interestDelete };
