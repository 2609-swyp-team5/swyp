"use client";

import type { ReactNode } from "react";

import { MySidebar } from "@/features/my/components/MySidebar";
import { useAuthStore } from "@/features/auth/store/authStore";

export function MyLayoutGuard({ children }: { children: ReactNode }) {
    const isLoggedIn = useAuthStore((state) => state.isLoggedIn);
    const isInitialized = useAuthStore((state) => state.isInitialized);

    if (!isInitialized || !isLoggedIn) {
        return null;
    }

    return (
        <div className="bg-background flex flex-1 flex-col lg:min-h-[1000px] lg:flex-row">
            <MySidebar />
            <div className="min-w-0 flex-1">{children}</div>
        </div>
    );
}
