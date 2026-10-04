"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";

import { LoginRequiredDialog } from "@/features/auth/components/LoginRequiredDialog";
import { ROUTES } from "@/constants/routes";
import { useAuthStore } from "@/features/auth/store/authStore";
import { NotificationToaster } from "@/features/notifications/components/NotificationToaster";

export default function MainLayout({ children }: { children: ReactNode }) {
    const pathname = usePathname();
    const isInitialized = useAuthStore((state) => state.isInitialized);
    const isLoggedIn = useAuthStore((state) => state.isLoggedIn);
    const requiresLoginNotice = ROUTES.some(
        (route) =>
            route.requiresAuth &&
            route.href !== "/my" &&
            (pathname === route.href || pathname.startsWith(`${route.href}/`)),
    );

    if (!requiresLoginNotice || (isInitialized && isLoggedIn)) {
        return (
            <>
                {children}
                <NotificationToaster />
            </>
        );
    }

    return <LoginRequiredDialog open={isInitialized && !isLoggedIn} />;
}
