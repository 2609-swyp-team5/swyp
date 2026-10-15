"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronLeft } from "lucide-react";

import { MySidebar } from "@/features/my/components/MySidebar";
import { useAuthStore } from "@/features/auth/store/authStore";

export function MyLayoutGuard({ children }: { children: ReactNode }) {
    const pathname = usePathname();
    const isLoggedIn = useAuthStore((state) => state.isLoggedIn);
    const isInitialized = useAuthStore((state) => state.isInitialized);
    const isMyHome = pathname === "/my";

    if (!isInitialized || !isLoggedIn) {
        return null;
    }

    return (
        <div className="bg-background flex flex-1 flex-col lg:min-h-[1000px] lg:flex-row">
            {/* 좁은 화면의 하위 화면은 프로필·메뉴 대신 마이페이지로 돌아가는 링크만 둔다. */}
            {isMyHome ? null : (
                <div className="border-b border-[#dedee6] bg-[#fafbff] lg:hidden">
                    <Link
                        href="/my"
                        className="typography-body-medium layout-container flex min-h-11 items-center gap-1 font-semibold text-[#6b6c7b] hover:text-[#6653fb]"
                    >
                        <ChevronLeft className="size-5" aria-hidden="true" />
                        마이페이지
                    </Link>
                </div>
            )}
            <MySidebar className={isMyHome ? undefined : "hidden lg:flex"} />
            <div className="min-w-0 flex-1">{children}</div>
        </div>
    );
}
