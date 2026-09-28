import { api } from "@/common/lib/api/client";
import type { ApiResponse } from "@/common/lib/api/types";

import type { MemberResponse, MemberUpdateRequest, PasswordChangeRequest } from "../types";

const memberMe = (signal?: AbortSignal) =>
    api.get<ApiResponse<MemberResponse>>("/users/me", { signal });

const memberWithdraw = () => api.delete<ApiResponse<null>>("/users/me");

const memberUpdate = (params: MemberUpdateRequest) =>
    api.patch<ApiResponse<MemberResponse>>("/users/me", params);

const memberUpdateImage = (image: File) => {
    const formData = new FormData();
    formData.append("image", image);
    return api.post<ApiResponse<MemberResponse>>("/users/profile/image", formData);
};

const memberChangePassword = (params: PasswordChangeRequest) =>
    api.patch<ApiResponse<null>>("/users/password", params);

export const memberApi = {
    memberMe,
    memberWithdraw,
    memberUpdate,
    memberUpdateImage,
    memberChangePassword,
};
