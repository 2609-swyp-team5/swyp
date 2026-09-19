import axios, { type InternalAxiosRequestConfig } from "axios";

import type { LoginResponse } from "@/features/auth/types";

import type { ApiResponse } from "./types";

type RetryRequestConfig = InternalAxiosRequestConfig & { _retry?: boolean };

let refreshPromise: Promise<string> | null = null;

const baseURL = process.env.NEXT_PUBLIC_API_URL;

if (!baseURL?.trim()) {
    throw new Error(
        "NEXT_PUBLIC_API_URL이 설정되지 않았습니다. frontend의 환경변수 파일 또는 빌드 환경변수를 확인해 주세요.",
    );
}

export const api = axios.create({
    baseURL,
    timeout: 10_000,
    withCredentials: true,
});

api.interceptors.request.use(
    (config) => {
        if (typeof window !== "undefined") {
            const accessToken = sessionStorage.getItem("accessToken");

            if (accessToken) {
                config.headers.Authorization = `Bearer ${accessToken}`;
            }
        }

        return config;
    },
    (error) => {
        return Promise.reject(error);
    },
);

api.interceptors.response.use(
    (response) => response,
    async (error: unknown) => {
        if (!axios.isAxiosError(error) || typeof window === "undefined") {
            return Promise.reject(error);
        }

        const config = error.config as RetryRequestConfig | undefined;
        if (!config || error.response?.status !== 401 || config._retry) {
            return Promise.reject(error);
        }

        const pathname = new URL(api.getUri(config), window.location.origin).pathname;
        const excludedPaths = [
            "/auth/login",
            "/auth/signup",
            "/auth/social/login",
            "/auth/refresh",
        ];
        const accessToken = sessionStorage.getItem("accessToken");
        if (excludedPaths.includes(pathname) || !accessToken || !config.headers.Authorization) {
            return Promise.reject(error);
        }

        config._retry = true;

        // 다른 요청이 이미 재발급했다면 최신 토큰으로 재시도합니다.
        if (config.headers.Authorization !== `Bearer ${accessToken}`) {
            config.headers.Authorization = `Bearer ${accessToken}`;
            return api(config);
        }

        if (!refreshPromise) {
            refreshPromise = (async (): Promise<string> => {
                try {
                    const res = await api.post<ApiResponse<LoginResponse>>("/auth/refresh");
                    if (!res.data.success) {
                        throw new Error(res.data.message);
                    }

                    if (sessionStorage.getItem("accessToken") !== accessToken) {
                        throw new axios.CanceledError("재발급 중 로그인 상태가 변경되었습니다.");
                    }

                    const newAccessToken = res.data.data.accessToken;
                    sessionStorage.setItem("accessToken", newAccessToken);
                    return newAccessToken;
                } catch (err) {
                    // 초기 모듈 로딩 시 client → store → authApi 순환을 피합니다.
                    const { useAuthStore } = await import("@/features/auth/store/authStore");
                    if (sessionStorage.getItem("accessToken") === accessToken) {
                        sessionStorage.removeItem("accessToken");
                        useAuthStore.setState({ isLoggedIn: false });
                    }
                    return Promise.reject(err);
                } finally {
                    refreshPromise = null;
                }
            })();
        }

        const newAccessToken = await refreshPromise;
        config.headers.Authorization = `Bearer ${newAccessToken}`;
        return api(config);
    },
);
