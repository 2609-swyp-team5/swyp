"use client";

import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/features/auth/store/authStore";
import { useMeQuery } from "@/features/member/hooks/queries/useMeQuery";
import { homeApi } from "@/features/home/api/homeApi";
import { homeSummaryResponseSchema } from "@/features/home/schemas/homeResponseSchema";

export function useHomeSummaryQuery() {
    const isInitialized = useAuthStore((state) => state.isInitialized);
    const isLoggedIn = useAuthStore((state) => state.isLoggedIn);
    const member = useMeQuery();
    const memberId = isLoggedIn ? member.data?.memberId : undefined;
    return useQuery({
        queryKey: ["home-summary", memberId],
        queryFn: async ({ signal }) => {
            const { data } = await homeApi.summary(signal);
            if (!data.success) throw new Error(data.message);
            return homeSummaryResponseSchema.parse(data.data);
        },
        enabled: isInitialized && isLoggedIn && memberId !== undefined,
        retry: false,
    });
}
