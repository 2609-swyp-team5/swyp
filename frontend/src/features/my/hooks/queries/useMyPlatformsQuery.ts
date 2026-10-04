"use client";

import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/features/auth/store/authStore";
import { myApi } from "@/features/my/api/myApi";

export function useMyPlatformsQuery() {
    const isInitialized = useAuthStore((state) => state.isInitialized);
    const isLoggedIn = useAuthStore((state) => state.isLoggedIn);

    return useQuery({
        queryKey: ["my-platforms"],
        queryFn: async ({ signal }) => {
            const { data } = await myApi.myPlatforms(signal);
            if (!data.success) throw new Error(data.message);
            return data.data;
        },
        enabled: isInitialized && isLoggedIn,
        retry: false,
    });
}
