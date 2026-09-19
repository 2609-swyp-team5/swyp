"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { HEADER_LINKS } from "@/constants/routes";
import { getApiErrorMessage } from "@/common/lib/api/error";
import { useAuthStore } from "@/features/auth/store/authStore";

function isRouteActive(pathname: string, href: string) {
    return pathname === href || pathname.startsWith(`${href}/`);
}

export function SiteHeader() {
    const pathname = usePathname();
    const isLoggedIn = useAuthStore((state) => state.isLoggedIn);
    const logout = useAuthStore((state) => state.logout);
    const [isLoggingOut, setIsLoggingOut] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");

    const handleLogout = async () => {
        setIsLoggingOut(true);
        setErrorMessage("");

        try {
            const result = await logout();
            if (result && !result.success) {
                setErrorMessage(result.message);
            }
        } catch (error) {
            setErrorMessage(getApiErrorMessage(error));
        } finally {
            setIsLoggingOut(false);
        }
    };

    return (
        <header className="border-border bg-background border-b">
            <div className="layout-container flex min-h-[var(--header-height)] items-center justify-between gap-6">
                <Link href="/" className="typography-heading-03 text-primary">
                    지금이니?
                </Link>

                <nav
                    aria-label="주요 메뉴"
                    className="flex min-w-0 flex-1 items-center justify-end gap-1 overflow-x-auto"
                >
                    {HEADER_LINKS.map((link) => (
                        <Link
                            key={link.href}
                            href={link.href}
                            aria-current={isRouteActive(pathname, link.href) ? "page" : undefined}
                            className={`typography-body-medium rounded-lg px-3 py-2 whitespace-nowrap transition-colors ${
                                isRouteActive(pathname, link.href)
                                    ? "bg-primary/10 text-primary font-semibold"
                                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                            }`}
                        >
                            {link.label}
                        </Link>
                    ))}
                </nav>

                <div className="typography-body-medium flex items-center gap-2">
                    {isLoggedIn ? (
                        <Link
                            href="/my"
                            aria-label="프로필"
                            title="프로필"
                            aria-current={isRouteActive(pathname, "/my") ? "page" : undefined}
                            className={`typography-body-medium inline-flex size-9 items-center justify-center rounded-full font-semibold ${
                                isRouteActive(pathname, "/my")
                                    ? "bg-primary text-primary-foreground"
                                    : "bg-muted text-foreground"
                            }`}
                        >
                            <span aria-hidden="true">P</span>
                        </Link>
                    ) : null}
                    {isLoggedIn ? (
                        <button
                            type="button"
                            onClick={handleLogout}
                            disabled={isLoggingOut}
                            className="text-muted-foreground hover:text-foreground rounded-full px-3 py-2 transition-colors disabled:opacity-50"
                        >
                            {isLoggingOut ? "로그아웃 중..." : "로그아웃"}
                        </button>
                    ) : (
                        <Link
                            href="/login"
                            className="text-muted-foreground hover:text-foreground rounded-full px-3 py-2 transition-colors"
                        >
                            로그인
                        </Link>
                    )}
                </div>
            </div>
            {errorMessage ? (
                <p role="alert" className="px-6 pb-3 text-sm text-red-600 lg:px-8">
                    {errorMessage}
                </p>
            ) : null}
        </header>
    );
}
