import { create } from "zustand";
import { devtools } from "zustand/middleware";

import type { ApiResponse } from "@/common/lib/api/types";
import { authApi } from "@/features/auth/api/authApi";
import type { LoginRequest, LoginResponse } from "@/features/auth/types";

interface AuthStore {
    isLoggedIn: boolean;
    isInitialized: boolean;
    checkStatus: () => void;
    login: (params: LoginRequest) => Promise<ApiResponse<LoginResponse>>;
    logout: () => Promise<ApiResponse<null> | undefined>;
}

export const useAuthStore = create<AuthStore>()(
    devtools(
        (set) => ({
            isLoggedIn: false,
            isInitialized: false,
            checkStatus: () => {
                const accessToken = sessionStorage.getItem("accessToken");
                set(
                    { isLoggedIn: Boolean(accessToken), isInitialized: true },
                    false,
                    "auth/checkStatus",
                );
            },
            login: async (params: LoginRequest) => {
                const result = await authApi.login(params);

                if (result.data.success) {
                    const accessToken = result.data.data.accessToken;
                    sessionStorage.setItem("accessToken", accessToken);
                    set({ isLoggedIn: Boolean(accessToken) }, false, "auth/login");
                }

                return result.data;
            },
            logout: async () => {
                const accessToken = sessionStorage.getItem("accessToken");

                if (!accessToken) {
                    set({ isLoggedIn: false }, false, "auth/logout");
                    return;
                }

                const result = await authApi.logout();

                if (result.data.success) {
                    sessionStorage.removeItem("accessToken");
                    set({ isLoggedIn: false }, false, "auth/logout");
                }

                return result.data;
            },
        }),
        { name: "AuthStore", enabled: process.env.NODE_ENV === "development" },
    ),
);
