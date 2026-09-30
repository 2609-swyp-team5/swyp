import { api } from "@/common/lib/api/client";
import type { ApiResponse } from "@/common/lib/api/types";

import type { InterestListItem } from "../types";

const getInterests = (params?: { page?: number; size?: number }) =>
    api.get<ApiResponse<InterestListItem[]>>("/interests", {
        params: {
            page: params?.page ?? 0,
            size: params?.size ?? 20,
        },
    });

const deleteInterest = (interestId: number) =>
    api.delete<ApiResponse<null>>(`/interests/${interestId}`);

export const interestApi = {
    getInterests,
    deleteInterest,
};
