import { api } from "@/common/lib/api/client";
import type { ApiResponse } from "@/common/lib/api/types";

import type { MemberResponse } from "../types";

export const memberApi = {
    memberMe: (params?: AbortSignal) =>
        api.get<ApiResponse<MemberResponse>>("/users/me", { params }),
};
