"use client";

import { useMutation } from "@tanstack/react-query";

import { authApi } from "@/features/auth/api/authApi";
import type { SignUpRequest, SignUpResponse } from "@/features/auth/types";

interface UseSignUpMutationCallbacks {
    onSuccess?: (data: SignUpResponse) => void;
    onError?: (error: Error) => void;
}

// 회원가입 요청과 화면별 성공·실패 처리 연결
export function useSignUpMutation(callbacks?: UseSignUpMutationCallbacks) {
    return useMutation({
        mutationFn: async (params: SignUpRequest) => {
            const { data } = await authApi.authSignUp(params);
            if (!data.success) {
                throw new Error(data.message);
            }
            return data.data;
        },
        retry: false,
        onSuccess: (data) => callbacks?.onSuccess?.(data),
        onError: (error) => callbacks?.onError?.(error),
    });
}
