import { api } from "@/common/lib/api/client";
import type { ApiResponse } from "@/common/lib/api/types";

import type {
    EmailAvailabilityResponse,
    LoginRequest,
    LoginResponse,
    PasswordResetRequest,
    SignUpRequest,
    SignUpResponse,
    SocialLoginRequest,
    TokenResponse,
} from "../types";

export const authApi = {
    // 입력한 정보로 회원가입 요청
    authSignUp: (params: SignUpRequest) =>
        api.post<ApiResponse<SignUpResponse>>("/auth/signup", params),

    // 이메일과 비밀번호로 로그인 요청
    authLogin: (params: LoginRequest) =>
        api.post<ApiResponse<LoginResponse>>("/auth/login", params),

    // 소셜 제공자의 인증 토큰으로 로그인 요청
    authSocialLogin: (params: SocialLoginRequest) =>
        api.post<ApiResponse<TokenResponse>>("/auth/social/login", params),

    // 로그아웃 및 리프레시 토큰 무효화 요청
    authLogout: () => api.post<ApiResponse<null>>("/auth/logout"),

    // 쿠키의 리프레시 토큰으로 액세스 토큰 재발급 요청
    authRefresh: () => api.post<ApiResponse<TokenResponse>>("/auth/refresh"),

    // 이메일 사용 가능 여부 확인
    authEmailCheck: (params: string) =>
        api.get<ApiResponse<EmailAvailabilityResponse>>("/auth/email/check", {
            params: { email: params },
        }),

    // 비밀번호 재설정 메일 발송 요청
    authPasswordReset: (params: PasswordResetRequest) =>
        api.post<ApiResponse<null>>("/auth/password/reset", params),
};
