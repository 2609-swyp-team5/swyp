import { api } from "@/common/lib/api/client";
import type { ApiResponse } from "@/common/lib/api/types";

import type {
    BunjangVerificationConfirmResponse,
    BunjangVerificationRequest,
    BunjangVerificationResponse,
    MyPlatformType,
    MyPlatformConnection,
} from "../types";

const myPlatforms = (signal?: AbortSignal) =>
    api.get<ApiResponse<MyPlatformConnection[]>>("/platforms", { signal });

const requestBunjangVerification = (
    platform: MyPlatformType,
    request: BunjangVerificationRequest,
) =>
    api.post<ApiResponse<BunjangVerificationResponse>>(
        `/platforms/${platform}/verification`,
        request,
    );

const confirmBunjangVerification = (
    platform: MyPlatformType,
    verificationId: string,
    otp: string,
) =>
    api.post<ApiResponse<BunjangVerificationConfirmResponse>>(
        `/platforms/${platform}/verification/${verificationId}/confirm`,
        { otp },
    );

const disconnectPlatform = (platform: MyPlatformType) =>
    api.delete<ApiResponse<null>>(`/platforms/${platform}`);

export const myApi = {
    myPlatforms,
    requestBunjangVerification,
    confirmBunjangVerification,
    disconnectPlatform,
};
