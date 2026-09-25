"use client";

import { useMutation } from "@tanstack/react-query";

import { useAuthStore } from "@/features/auth/store/authStore";
import { memberApi } from "@/features/member/api/memberApi";

export function useWithdrawMutation() {
    const clearAuth = useAuthStore((state) => state.clearAuth);

    return useMutation({
        mutationFn: async () => {
            const { data } = await memberApi.memberWithdraw();
            if (!data.success) {
                throw new Error(data.message);
            }
            return data.message;
        },
        retry: false,
        onSuccess: () => clearAuth(),
    });
}
