"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { HEADER_LINKS } from "@/constants/routes";

function isRouteActive(pathname: string, href: string) {
    return pathname === href || pathname.startsWith(`${href}/`);
}

export function SiteHeader() {
    const pathname = usePathname();

    return (
        <header className="border-border bg-background border-b">
            <div className="mx-auto flex min-h-16 w-full max-w-7xl items-center justify-between gap-6 px-6 lg:px-8">
                <Link href="/" className="text-primary text-lg font-bold tracking-tight">
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
                            className={`rounded-lg px-3 py-2 text-sm whitespace-nowrap transition-colors ${
                                isRouteActive(pathname, link.href)
                                    ? "bg-primary/10 text-primary font-semibold"
                                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                            }`}
                        >
                            {link.label}
                        </Link>
                    ))}
                </nav>

                <div className="flex items-center gap-2 text-sm">
                    <Link
                        href="/login"
                        className="text-muted-foreground hover:text-foreground rounded-full px-3 py-2 transition-colors"
                    >
                        로그인
                    </Link>
                    <Link
                        href="/my"
                        aria-label="프로필"
                        title="프로필"
                        aria-current={isRouteActive(pathname, "/my") ? "page" : undefined}
                        className={`inline-flex size-9 items-center justify-center rounded-full font-semibold ${
                            isRouteActive(pathname, "/my")
                                ? "bg-primary text-primary-foreground"
                                : "bg-muted text-foreground"
                        }`}
                    >
                        <span aria-hidden="true">P</span>
                    </Link>
                </div>
            </div>
        </header>
    );
}
