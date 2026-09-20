import { api } from "@/common/lib/api/client";
import type { ApiResponse } from "@/common/lib/api/types";

import type {
    LoginRequest,
    LoginResponse,
    SignUpRequest,
    SignUpResponse,
    TokenResponse,
} from "../types";

// 입력한 정보로 회원가입 요청
const authSignUp = (params: SignUpRequest) => {
    return api.post<ApiResponse<SignUpResponse>>("/auth/signup", params);
};

// 이메일과 비밀번호로 로그인 요청
const authLogin = (params: LoginRequest) => {
    return api.post<ApiResponse<LoginResponse>>("/auth/login", params);
};

// 로그아웃 및 리프레시 토큰 무효화 요청
const authLogout = () => {
    return api.post<ApiResponse<null>>("/auth/logout");
};

// 쿠키의 리프레시 토큰으로 액세스 토큰 재발급 요청
const authRefresh = () => {
    return api.post<ApiResponse<TokenResponse>>("/auth/refresh");
};

export const authApi = {
    authSignUp,
    authLogin,
    authLogout,
    authRefresh,
};
