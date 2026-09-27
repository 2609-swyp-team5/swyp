"use client";

import { useMutation } from "@tanstack/react-query";

import { authApi } from "@/features/auth/api/authApi";
import type { LoginRequest } from "@/features/auth/types";
import { useAuthStore } from "@/features/auth/store/authStore";

interface UseLoginMutationCallbacks {
    onError?: (error: Error) => void;
}

// 일반 로그인 요청과 성공 시 전역 인증 상태 갱신
export function useLoginMutation(callbacks?: UseLoginMutationCallbacks) {
    const setAccessToken = useAuthStore((state) => state.setAccessToken);

    return useMutation({
        mutationFn: async (params: LoginRequest) => {
            const { data } = await authApi.authLogin(params);
            if (!data.success) {
                throw new Error(data.message);
            }
            return data.data;
        },
        retry: false,
        onSuccess: (data) => setAccessToken(data.accessToken),
        onError: (error) => callbacks?.onError?.(error),
    });
}
