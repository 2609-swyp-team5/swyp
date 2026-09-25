"use client";

import { useQuery } from "@tanstack/react-query";

import { useAuthStore } from "@/features/auth/store/authStore";
import { memberApi } from "@/features/member/api/memberApi";

export function useMeQuery() {
    const isInitialized = useAuthStore((state) => state.isInitialized);
    const isLoggedIn = useAuthStore((state) => state.isLoggedIn);

    return useQuery({
        queryKey: ["member", "me"],
        queryFn: async ({ signal }) => {
            const { data } = await memberApi.memberMe(signal);
            if (!data.success) {
                throw new Error(data.message);
            }
            return data.data;
        },
        enabled: isInitialized && isLoggedIn,
        staleTime: 5 * 60 * 1000,
        retry: false,
    });
}
