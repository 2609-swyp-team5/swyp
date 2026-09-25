import { api } from "@/common/lib/api/client";
import type { ApiResponse } from "@/common/lib/api/types";

import type { MemberResponse, MemberUpdateRequest, PasswordChangeRequest } from "../types";

export const memberApi = {
    memberMe: (signal?: AbortSignal) =>
        api.get<ApiResponse<MemberResponse>>("/users/me", { signal }),

    memberWithdraw: () => api.delete<ApiResponse<null>>("/users/me"),

    memberUpdate: (params: MemberUpdateRequest) =>
        api.patch<ApiResponse<MemberResponse>>("/users/me", params),

    memberUpdateImage: (image: File) => {
        const formData = new FormData();
        formData.append("image", image);
        return api.post<ApiResponse<MemberResponse>>("/users/profile/image", formData);
    },

    memberChangePassword: (params: PasswordChangeRequest) =>
        api.patch<ApiResponse<null>>("/users/password", params),
};
