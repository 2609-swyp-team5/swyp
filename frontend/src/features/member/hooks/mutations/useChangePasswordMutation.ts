"use client";

import { useMutation } from "@tanstack/react-query";

import { memberApi } from "@/features/member/api/memberApi";
import type { PasswordChangeRequest } from "@/features/member/types";

export function useChangePasswordMutation() {
    return useMutation({
        mutationFn: async (params: PasswordChangeRequest) => {
            const { data } = await memberApi.memberChangePassword(params);
            if (!data.success) {
                throw new Error(data.message);
            }
            return data.message;
        },
        retry: false,
    });
}
