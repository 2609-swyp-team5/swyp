import { api } from "@/common/lib/api/client";
import type { ApiResponse } from "@/common/lib/api/types";

import type {
    InterestCreateResponse,
    InterestListResponse,
    InterestRegisterInput,
    InterestStatus,
} from "../types";
import { interestRegisterInputSchema } from "../schemas/interestRequestSchema";

const getInterests = (params?: { status?: InterestStatus; cursor?: string; size?: number }) =>
    api.get<ApiResponse<InterestListResponse>>("/interests", {
        params: {
            status: params?.status,
            cursor: params?.cursor,
            size: params?.size ?? 20,
        },
    });

const registerInterest = (input: InterestRegisterInput) =>
    api.post<ApiResponse<InterestCreateResponse>>(
        "/interests",
        interestRegisterInputSchema.parse(input),
    );

const deleteInterest = (interestId: number) =>
    api.delete<ApiResponse<null>>(`/interests/${interestId}`);

export const interestApi = {
    getInterests,
    registerInterest,
    deleteInterest,
};
