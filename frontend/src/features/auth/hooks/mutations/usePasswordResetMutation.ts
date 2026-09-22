"use client";

import { useMutation } from "@tanstack/react-query";

import { authApi } from "@/features/auth/api/authApi";
import type { PasswordResetRequest } from "@/features/auth/types";

interface UsePasswordResetMutationCallbacks {
    onSuccess?: (message: string) => void;
    onError?: (error: Error) => void;
}

export function usePasswordResetMutation(callbacks?: UsePasswordResetMutationCallbacks) {
    return useMutation({
        mutationFn: async (params: PasswordResetRequest) => {
            const { data } = await authApi.authPasswordReset(params);
            if (!data.success) {
                throw new Error(data.message);
            }
            return data.message;
        },
        retry: false,
        onSuccess: (message) => callbacks?.onSuccess?.(message),
        onError: (error) => callbacks?.onError?.(error),
    });
}
