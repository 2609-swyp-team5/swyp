import { api } from "@/common/lib/api/client";
import type { ApiResponse } from "@/common/lib/api/types";

import type {
    EmailAvailabilityResponse,
    LoginRequest,
    LoginResponse,
    PasswordResetConfirmRequest,
    PasswordResetRequest,
    SignUpRequest,
    SignUpResponse,
    SocialLoginRequest,
    TokenResponse,
} from "../types";

// 입력한 정보로 회원가입 요청
const authSignUp = (params: SignUpRequest) =>
    api.post<ApiResponse<SignUpResponse>>("/auth/signup", params);

// 이메일과 비밀번호로 로그인 요청
const authLogin = (params: LoginRequest) =>
    api.post<ApiResponse<LoginResponse>>("/auth/login", params);

// 소셜 제공자의 인증 토큰으로 로그인 요청
const authSocialLogin = (params: SocialLoginRequest) =>
    api.post<ApiResponse<TokenResponse>>("/auth/social/login", params);

// 로그아웃 및 리프레시 토큰 무효화 요청
const authLogout = () => api.post<ApiResponse<null>>("/auth/logout");

// 쿠키의 리프레시 토큰으로 액세스 토큰 재발급 요청
const authRefresh = () => api.post<ApiResponse<TokenResponse>>("/auth/refresh");

// 이메일 사용 가능 여부 확인
const authEmailCheck = (params: string) =>
    api.get<ApiResponse<EmailAvailabilityResponse>>("/auth/email/check", {
        params: { email: params },
    });

// 비밀번호 재설정 메일 발송 요청
const authPasswordReset = (params: PasswordResetRequest) =>
    api.post<ApiResponse<null>>("/auth/password/reset", params);

// 메일 링크의 토큰과 새 비밀번호로 재설정 확정
const authPasswordResetConfirm = (params: PasswordResetConfirmRequest) =>
    api.patch<ApiResponse<null>>("/auth/password/reset", params);

export const authApi = {
    authSignUp,
    authLogin,
    authSocialLogin,
    authLogout,
    authRefresh,
    authEmailCheck,
    authPasswordReset,
    authPasswordResetConfirm,
};
