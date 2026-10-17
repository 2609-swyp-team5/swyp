import { api } from "@/common/lib/api/client";
import { resizeImageForUpload } from "@/common/lib/image/resizeImageForUpload";
import type { ApiResponse } from "@/common/lib/api/types";

import type { MemberResponse, MemberUpdateRequest, PasswordChangeRequest } from "../types";

const memberMe = (signal?: AbortSignal) =>
    api.get<ApiResponse<MemberResponse>>("/users/me", { signal });

const memberWithdraw = () => api.delete<ApiResponse<null>>("/users/me");

const memberUpdate = (params: MemberUpdateRequest) =>
    api.patch<ApiResponse<MemberResponse>>("/users/me", params);

const memberUpdateImage = async (image: File) => {
    const formData = new FormData();
    // 프로필은 작게 보이므로 더 작게 줄인다
    formData.append("image", await resizeImageForUpload(image, { maxSide: 1024 }));
    return api.post<ApiResponse<MemberResponse>>("/users/profile/image", formData);
};

const memberChangePassword = (params: PasswordChangeRequest) =>
    api.patch<ApiResponse<null>>("/users/password", params);

const memberDeleteImage = () => api.delete<ApiResponse<MemberResponse>>("/users/profile/image");

export const memberApi = {
    memberMe,
    memberWithdraw,
    memberUpdate,
    memberUpdateImage,
    memberDeleteImage,
    memberChangePassword,
};
