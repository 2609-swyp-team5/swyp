"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import { Avatar, AvatarFallback } from "@/common/components/ui/Avatar";
import { Button } from "@/common/components/ui/Button";
import { HEADER_LINKS } from "@/constants/routes";
import { useAuthStore } from "@/features/auth/store/authStore";

function isRouteActive(pathname: string, href: string) {
    return pathname === href || pathname.startsWith(`${href}/`);
}

export function SiteHeader() {
    const pathname = usePathname();
    const router = useRouter();
    const isProfileActive = isRouteActive(pathname, "/my");
    const isLoggedIn = useAuthStore((state) => state.isLoggedIn);
    const isAuthPage =
        pathname === "/login" || pathname === "/signup" || pathname === "/account/reset-password";
    const hideMenus = pathname === "/" || isAuthPage;
    const logoHref = isAuthPage || (pathname === "/" && !isLoggedIn) ? "/" : "/home";

    return (
        <header className="border-border bg-background border-b">
            <div className="layout-container flex min-h-[var(--header-height)] items-center justify-between gap-6">
                <Link href={logoHref} className="shrink-0">
                    <Image src="/logo.png" alt="지금이니?" width={100} height={55} />
                </Link>

                <nav
                    aria-label="주요 메뉴"
                    className={`flex min-w-0 flex-1 items-center justify-end gap-1 ${hideMenus ? "invisible" : ""}`}
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
                    {isLoggedIn && !isAuthPage ? (
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
                    {!isLoggedIn || isAuthPage ? (
                        <Button
                            type="button"
                            onClick={() => router.push("/login")}
                            className="typography-body-medium h-auto rounded-full px-[30px] py-2.5"
                        >
                            로그인
                        </Button>
                    ) : null}
                </div>
            </div>
        </header>
    );
}
