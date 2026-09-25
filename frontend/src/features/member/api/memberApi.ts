import { api } from "@/common/lib/api/client";
import type { ApiResponse } from "@/common/lib/api/types";

import type { MemberResponse, PasswordChangeRequest } from "../types";

export const memberApi = {
    memberMe: (signal?: AbortSignal) =>
        api.get<ApiResponse<MemberResponse>>("/users/me", { signal }),

    memberWithdraw: () => api.delete<ApiResponse<null>>("/users/me"),

    memberChangePassword: (params: PasswordChangeRequest) =>
        api.patch<ApiResponse<null>>("/users/password", params),
};
