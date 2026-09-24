"use client";

import { useMutation } from "@tanstack/react-query";

import { authApi } from "@/features/auth/api/authApi";
import type { PasswordResetConfirmRequest } from "@/features/auth/types";

interface UsePasswordResetConfirmMutationCallbacks {
    onSuccess?: (message: string) => void;
    onError?: (error: Error) => void;
}

export function usePasswordResetConfirmMutation(
    callbacks?: UsePasswordResetConfirmMutationCallbacks,
) {
    return useMutation({
        mutationFn: async (params: PasswordResetConfirmRequest) => {
            const { data } = await authApi.authPasswordResetConfirm(params);
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
