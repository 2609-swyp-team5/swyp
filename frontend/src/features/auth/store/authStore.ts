import { CanceledError } from "axios";
import { create } from "zustand";
import { devtools } from "zustand/middleware";

import { authApi } from "@/features/auth/api/authApi";

interface AuthStore {
    accessToken: string | null;
    isLoggedIn: boolean;
    isInitialized: boolean;
    checkStatus: () => Promise<void>;
    refresh: () => Promise<string>;
    setAccessToken: (accessToken: string) => void;
    logout: () => Promise<void>;
}

let refreshPromise: Promise<string> | null = null;
let authVersion = 0;

export const useAuthStore = create<AuthStore>()(
    devtools(
        (set, get) => ({
            accessToken: null,
            isLoggedIn: false,
            isInitialized: false,
            checkStatus: async () => {
                if (get().isInitialized) return;
                try {
                    await get().refresh();
                } catch {
                    // 복구할 수 없으면 비로그인 상태로 초기화를 마칩니다.
                } finally {
                    set({ isInitialized: true }, false, "auth/checkStatus");
                }
            },
            refresh: () => {
                if (refreshPromise) return refreshPromise;
                const accessToken = get().accessToken;
                const version = authVersion;
                refreshPromise = (async () => {
                    try {
                        const result = await authApi.authRefresh();
                        if (!result.data.success) {
                            throw new Error(result.data.message);
                        }
                        if (version !== authVersion || get().accessToken !== accessToken) {
                            throw new CanceledError("재발급 중 로그인 상태가 변경되었습니다.");
                        }
                        const newAccessToken = result.data.data.accessToken;
                        set(
                            { accessToken: newAccessToken, isLoggedIn: true },
                            false,
                            "auth/refresh",
                        );
                        return newAccessToken;
                    } catch (error) {
                        if (version === authVersion && get().accessToken === accessToken) {
                            set(
                                { accessToken: null, isLoggedIn: false },
                                false,
                                "auth/refreshFailed",
                            );
                        }
                        throw error;
                    } finally {
                        refreshPromise = null;
                    }
                })();
                return refreshPromise;
            },
            setAccessToken: (accessToken) => {
                authVersion++;
                set(
                    { accessToken, isLoggedIn: Boolean(accessToken) },
                    false,
                    "auth/setAccessToken",
                );
            },
            logout: async () => {
                const accessToken = get().accessToken;

                if (!accessToken) {
                    authVersion++;
                    set({ isLoggedIn: false }, false, "auth/logout");
                    return;
                }

                const result = await authApi.authLogout();
                if (!result.data.success) {
                    throw new Error(result.data.message);
                }

                authVersion++;
                set({ accessToken: null, isLoggedIn: false }, false, "auth/logout");
            },
        }),
        { name: "AuthStore", enabled: process.env.NODE_ENV === "development" },
    ),
);
