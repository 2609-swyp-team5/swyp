"use client";

import { useMutation } from "@tanstack/react-query";

import { useAuthStore } from "@/features/auth/store/authStore";

interface UseLogoutMutationCallbacks {
    onError?: (error: Error) => void;
}

// 기존 로그아웃 처리와 요청 상태·실패 처리 연결
export function useLogoutMutation(callbacks?: UseLogoutMutationCallbacks) {
    const logout = useAuthStore((state) => state.logout);

    return useMutation({
        mutationFn: logout,
        retry: false,
        onError: (error) => callbacks?.onError?.(error),
    });
}
