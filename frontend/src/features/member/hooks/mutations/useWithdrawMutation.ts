"use client";

import { useMutation } from "@tanstack/react-query";

import { memberApi } from "@/features/member/api/memberApi";

export function useWithdrawMutation() {
    return useMutation({
        mutationFn: async () => {
            const { data } = await memberApi.memberWithdraw();
            if (!data.success) {
                throw new Error(data.message);
            }
            return data.message;
        },
        retry: false,
    });
}
