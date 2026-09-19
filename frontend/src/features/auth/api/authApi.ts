import { api } from "@/common/lib/api/client";
import type { ApiResponse } from "@/common/lib/api/types";

import type { LoginRequest, LoginResponse, SignUpRequest, SignUpResponse } from "../types";

const authSignUp = (params: SignUpRequest) => {
    return api.post<ApiResponse<SignUpResponse>>("/auth/signup", params);
};

const authLogin = (params: LoginRequest) => {
    return api.post<ApiResponse<LoginResponse>>("/auth/login", params);
};

const authLogout = () => {
    return api.post<ApiResponse<null>>("/auth/logout");
};

const authRefresh = () => {
    return api.post<ApiResponse<LoginResponse>>("/auth/refresh");
};

export const authApi = {
    authSignUp,
    authLogin,
    authLogout,
    authRefresh,
};
