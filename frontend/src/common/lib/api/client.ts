import axios, { type InternalAxiosRequestConfig } from "axios";

import { useAuthStore } from "@/features/auth/store/authStore";

type RetryRequestConfig = InternalAxiosRequestConfig & { _retry?: boolean };

const REFRESH_EXCLUDED_PATHS = [
    "/auth/login",
    "/auth/signup",
    "/auth/social/login",
    "/auth/refresh",
];

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
            const accessToken = useAuthStore.getState().accessToken;

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
        const accessToken = useAuthStore.getState().accessToken;
        if (
            REFRESH_EXCLUDED_PATHS.includes(pathname) ||
            !accessToken ||
            !config.headers.Authorization
        ) {
            return Promise.reject(error);
        }

        config._retry = true;

        // 다른 요청이 이미 재발급했다면 최신 토큰으로 재시도합니다.
        if (config.headers.Authorization !== `Bearer ${accessToken}`) {
            config.headers.Authorization = `Bearer ${accessToken}`;
            return api(config);
        }

        const newAccessToken = await useAuthStore.getState().refresh();
        config.headers.Authorization = `Bearer ${newAccessToken}`;
        return api(config);
    },
);
