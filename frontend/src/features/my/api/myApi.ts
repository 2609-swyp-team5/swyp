import { api } from "@/common/lib/api/client";
import type { ApiResponse } from "@/common/lib/api/types";

import type {
    MyProductsParams,
    MyProductsResponse,
    MyPlatformType,
    MyPlatformConnection,
    MyPlatformConnectionState,
} from "../types";

const myProducts = (params: MyProductsParams, signal?: AbortSignal) =>
    api.get<ApiResponse<MyProductsResponse>>("/products/me", { params, signal });

const myPlatforms = (signal?: AbortSignal) =>
    api.get<ApiResponse<MyPlatformConnection[]>>("/platforms", { signal });

const connectPlatform = (platform: MyPlatformType, cookie: string) =>
    api.post<ApiResponse<MyPlatformConnectionState>>(`/platforms/${platform}/connect`, { cookie });

const disconnectPlatform = (platform: MyPlatformType) =>
    api.delete<ApiResponse<null>>(`/platforms/${platform}`);

export const myApi = {
    myProducts,
    myPlatforms,
    connectPlatform,
    disconnectPlatform,
};
