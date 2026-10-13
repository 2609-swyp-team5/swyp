"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";

import { LoginRequiredDialog } from "@/features/auth/components/LoginRequiredDialog";
import { ROUTES } from "@/constants/routes";
import { useAuthStore } from "@/features/auth/store/authStore";

// 화면은 둘러볼 수 있고, 실제 동작을 시작할 때 로그인 안내를 띄우는 경로(하위 경로는 계속 보호)
const GUEST_BROWSABLE_PATHS = ["/sell/register"];

export default function MainLayout({ children }: { children: ReactNode }) {
    const pathname = usePathname();
    const isInitialized = useAuthStore((state) => state.isInitialized);
    const isLoggedIn = useAuthStore((state) => state.isLoggedIn);
    const requiresLoginNotice =
        !GUEST_BROWSABLE_PATHS.includes(pathname) &&
        ROUTES.some(
            (route) =>
                route.requiresAuth &&
                route.href !== "/my" &&
                (pathname === route.href || pathname.startsWith(`${route.href}/`)),
        );

    if (!requiresLoginNotice || (isInitialized && isLoggedIn)) {
        return children;
    }

    return <LoginRequiredDialog open={isInitialized && !isLoggedIn} />;
}
