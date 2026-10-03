"use client";

import type { ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";

import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/common/components/ui/AlertDialog";
import { ROUTES } from "@/constants/routes";
import { useAuthStore } from "@/features/auth/store/authStore";

export default function MainLayout({ children }: { children: ReactNode }) {
    const pathname = usePathname();
    const router = useRouter();
    const isInitialized = useAuthStore((state) => state.isInitialized);
    const isLoggedIn = useAuthStore((state) => state.isLoggedIn);
    const requiresLoginNotice = ROUTES.some(
        (route) =>
            route.requiresAuth &&
            route.href !== "/my" &&
            (pathname === route.href || pathname.startsWith(`${route.href}/`)),
    );

    if (!requiresLoginNotice || (isInitialized && isLoggedIn)) return children;

    return (
        <AlertDialog open={isInitialized && !isLoggedIn}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>로그인이 필요합니다</AlertDialogTitle>
                    <AlertDialogDescription>로그인 후 사용해 주세요.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogAction onClick={() => router.replace("/login")}>
                        확인
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
