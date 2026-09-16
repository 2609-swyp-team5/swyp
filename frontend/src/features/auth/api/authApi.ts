import { api } from "@/common/lib/api/client";
import type { ApiResponse } from "@/common/lib/api/types";

import type { LoginRequest, LoginResponse, SignUpRequest, SignUpResponse } from "../types";

const signUp = (params: SignUpRequest) => {
    return api.post<ApiResponse<SignUpResponse>>("/auth/signup", params);
};

const login = (params: LoginRequest) => {
    return api.post<ApiResponse<LoginResponse>>("/auth/login", params);
};

export const authApi = {
    signUp,
    login,
};
