"use client";

import { useQuery } from "@tanstack/react-query";

import { authApi } from "@/features/auth/api/authApi";

export function useEmailCheckQuery(email: string) {
    return useQuery({
        queryKey: ["auth", "emailCheck", email],
        queryFn: async () => {
            const { data } = await authApi.authEmailCheck(email);
            if (!data.success) {
                throw new Error(data.message);
            }
            return data.data;
        },
        enabled: false,
        retry: false,
    });
}
