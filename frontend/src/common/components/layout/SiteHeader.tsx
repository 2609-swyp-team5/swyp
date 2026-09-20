"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { Avatar, AvatarFallback } from "@/common/components/ui/Avatar";
import { Button } from "@/common/components/ui/Button";
import { HEADER_LINKS } from "@/constants/routes";
import { getApiErrorMessage } from "@/common/lib/api/error";
import { useAuthStore } from "@/features/auth/store/authStore";

function isRouteActive(pathname: string, href: string) {
    return pathname === href || pathname.startsWith(`${href}/`);
}

export function SiteHeader() {
    const pathname = usePathname();
    const isProfileActive = isRouteActive(pathname, "/my");
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
                    className="flex min-w-0 flex-1 items-center justify-end gap-1"
                >
                    {HEADER_LINKS.map((link) => {
                        const isActive = isRouteActive(pathname, link.href);

                        return (
                            <Button
                                key={link.href}
                                asChild
                                variant="ghost"
                                className={`typography-body-medium h-auto rounded-lg px-3 py-2 whitespace-nowrap ${
                                    isActive
                                        ? "bg-primary/10 text-primary font-semibold"
                                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                                }`}
                            >
                                <Link href={link.href} aria-current={isActive ? "page" : undefined}>
                                    {link.label}
                                </Link>
                            </Button>
                        );
                    })}
                </nav>

                <div className="typography-body-medium flex items-center gap-2">
                    {isLoggedIn ? (
                        <Button
                            asChild
                            variant="ghost"
                            size="icon-lg"
                            className={`rounded-full p-0 ${
                                isProfileActive
                                    ? "bg-primary text-primary-foreground hover:bg-primary/80"
                                    : "bg-muted text-foreground"
                            }`}
                        >
                            <Link
                                href="/my"
                                aria-label="프로필"
                                title="프로필"
                                aria-current={isProfileActive ? "page" : undefined}
                            >
                                <Avatar aria-hidden="true" className="size-full after:border-0">
                                    <AvatarFallback className="bg-transparent font-semibold text-inherit">
                                        P
                                    </AvatarFallback>
                                </Avatar>
                            </Link>
                        </Button>
                    ) : null}
                    {isLoggedIn ? (
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={handleLogout}
                            disabled={isLoggingOut}
                            className="typography-body-medium text-muted-foreground hover:text-foreground h-auto rounded-full px-3 py-2"
                        >
                            {isLoggingOut ? "로그아웃 중..." : "로그아웃"}
                        </Button>
                    ) : (
                        <Button
                            asChild
                            variant="ghost"
                            className="typography-body-medium text-muted-foreground hover:text-foreground h-auto rounded-full px-3 py-2"
                        >
                            <Link href="/login">로그인</Link>
                        </Button>
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
