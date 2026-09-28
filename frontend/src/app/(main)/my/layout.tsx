"use client";

import type { ReactNode } from "react";

import { useAuthStore } from "@/features/auth/store/authStore";
import { MySidebar } from "@/features/my/components/MySidebar";

export default function MyLayout({ children }: { children: ReactNode }) {
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
