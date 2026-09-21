"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

import { ROUTES } from "@/constants/routes";
import { useAuthStore } from "@/features/auth/store/authStore";

export default function AuthInitializer() {
    const pathname = usePathname();
    const router = useRouter();
    const isLoggedIn = useAuthStore((state) => state.isLoggedIn);
    const isInitialized = useAuthStore((state) => state.isInitialized);
    const checkStatus = useAuthStore((state) => state.checkStatus);
    const requiresAuth = ROUTES.some(
        (route) =>
            route.requiresAuth &&
            (pathname === route.href || pathname.startsWith(`${route.href}/`)),
    );

    useEffect(() => {
        void checkStatus();
    }, [checkStatus]);

    useEffect(() => {
        if (isInitialized && requiresAuth && !isLoggedIn) {
            router.replace("/login");
        }
    }, [isInitialized, requiresAuth, isLoggedIn, pathname, router]);

    return null;
}
