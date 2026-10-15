"use client";

import { usePathname } from "next/navigation";

import { ROUTES } from "@/constants/routes";
import { useAuthStore } from "@/features/auth/store/authStore";

export const AUTH_PAGES = ["/login", "/signup", "/account/reset-password"];

export function isRouteActive(pathname: string, href: string) {
    return pathname === href || pathname.startsWith(`${href}/`);
}

/** 주요 메뉴(헤더 메뉴·모바일 하단 탭바)를 보여 줄지 — 온보딩·로그인 화면과 비로그인으로 연 보호 경로에서는 숨긴다. */
export function useMainNavigationVisible() {
    const pathname = usePathname();
    const isLoggedIn = useAuthStore((state) => state.isLoggedIn);
    const isInitialized = useAuthStore((state) => state.isInitialized);
    const isProtectedPath = ROUTES.some(
        (route) => route.requiresAuth && isRouteActive(pathname, route.href),
    );
    const isUnauthenticatedProtectedPath = isInitialized && !isLoggedIn && isProtectedPath;
    return !(pathname === "/" || AUTH_PAGES.includes(pathname) || isUnauthenticatedProtectedPath);
}
