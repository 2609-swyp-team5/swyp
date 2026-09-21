import { api } from "@/common/lib/api/client";
import type { ApiResponse } from "@/common/lib/api/types";

import type {
    LoginRequest,
    LoginResponse,
    SignUpRequest,
    SignUpResponse,
    SocialLoginRequest,
    TokenResponse,
} from "../types";

// 입력한 정보로 회원가입 요청
const authSignUp = async (params: SignUpRequest): Promise<SignUpResponse> => {
    const { data } = await api.post<ApiResponse<SignUpResponse>>("/auth/signup", params);

    if (!data.success) {
        throw new Error(data.message);
    }

    return data.data;
};

// 이메일과 비밀번호로 로그인 요청
const authLogin = async (params: LoginRequest): Promise<LoginResponse> => {
    const { data } = await api.post<ApiResponse<LoginResponse>>("/auth/login", params);

    if (!data.success) {
        throw new Error(data.message);
    }

    return data.data;
};

// 소셜 제공자의 인증 토큰으로 로그인 요청
const authSocialLogin = async (params: SocialLoginRequest): Promise<TokenResponse> => {
    const { data } = await api.post<ApiResponse<TokenResponse>>("/auth/social/login", params);

    if (!data.success) {
        throw new Error(data.message);
    }

    return data.data;
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
    authSocialLogin,
    authLogout,
    authRefresh,
};
