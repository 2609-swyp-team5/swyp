"use client";

import { useMutation } from "@tanstack/react-query";

import { authApi } from "@/features/auth/api/authApi";
import { useAuthStore } from "@/features/auth/store/authStore";

interface UseSocialLoginMutationCallbacks {
    onError?: (error: Error) => void;
}

// 소셜 로그인 요청과 성공 시 전역 인증 상태 갱신
export function useSocialLoginMutation(callbacks?: UseSocialLoginMutationCallbacks) {
    const setAccessToken = useAuthStore((state) => state.setAccessToken);

    return useMutation({
        mutationFn: authApi.authSocialLogin,
        retry: false,
        onSuccess: (data) => setAccessToken(data.accessToken),
        onError: (error) => callbacks?.onError?.(error),
    });
}
