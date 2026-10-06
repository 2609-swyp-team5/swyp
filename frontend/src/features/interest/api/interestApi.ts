import { api } from "@/common/lib/api/client";
import type { ApiResponse } from "@/common/lib/api/types";

import type {
    InterestCreateResponse,
    InterestListResponse,
    InterestRegisterInput,
    InterestStatus,
    InterestTargetPriceResponse,
} from "../types";
import { interestRegisterInputSchema } from "../schemas/interestRequestSchema";
import { startFastNotificationPolling } from "@/features/notifications/lib/fastPolling";

const getInterests = (params?: { status?: InterestStatus; cursor?: string; size?: number }) =>
    api.get<ApiResponse<InterestListResponse>>("/interests", {
        params: {
            status: params?.status,
            cursor: params?.cursor,
            size: params?.size ?? 20,
        },
    });

// 등록 직후 분석이 돌아 추천 알림이 곧 올 수 있어 토스트 조회를 잠시 앞당긴다
const registerInterest = async (input: InterestRegisterInput) => {
    const response = await api.post<ApiResponse<InterestCreateResponse>>(
        "/interests",
        interestRegisterInputSchema.parse(input),
    );
    startFastNotificationPolling();
    return response;
};

const deleteInterest = (interestId: number) =>
    api.delete<ApiResponse<null>>(`/interests/${interestId}`);

// null이면 목표가 해제
const setTargetPrice = (interestId: number, targetPrice: number | null) =>
    api.patch<ApiResponse<InterestTargetPriceResponse>>(`/interests/${interestId}/target-price`, {
        targetPrice,
    });

export const interestApi = {
    getInterests,
    registerInterest,
    deleteInterest,
    setTargetPrice,
};
