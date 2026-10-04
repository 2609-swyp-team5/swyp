"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { Menu, X } from "lucide-react";

import { Button } from "@/common/components/ui/Button";
import { Skeleton } from "@/common/components/ui/Skeleton";
import { HEADER_LINKS } from "@/constants/routes";
import { useAuthStore } from "@/features/auth/store/authStore";
import { ProfileAvatar } from "@/features/member/components/ProfileAvatar";
import { useMeQuery } from "@/features/member/hooks/queries/useMeQuery";

function isRouteActive(pathname: string, href: string) {
    return pathname === href || pathname.startsWith(`${href}/`);
}

export function SiteHeader() {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const menuButtonRef = useRef<HTMLButtonElement>(null);
    const pathname = usePathname();
    const router = useRouter();
    const isProfileActive = isRouteActive(pathname, "/my");
    const isLoggedIn = useAuthStore((state) => state.isLoggedIn);
    const isInitialized = useAuthStore((state) => state.isInitialized);
    const { data: member, isPending } = useMeQuery();
    const isAuthPage =
        pathname === "/login" || pathname === "/signup" || pathname === "/account/reset-password";
    const hideMenus = pathname === "/" || isAuthPage;
    const isOnboardingPage = pathname === "/";
    const logoHref = isAuthPage || (pathname === "/" && !isLoggedIn) ? "/" : "/home";
    const isProfileLoading = !isAuthPage && (!isInitialized || (isLoggedIn && isPending));

    return (
        <header className="border-border bg-background border-b">
            <div className="layout-container flex min-h-[var(--header-height)] items-center justify-between gap-3 py-2 lg:gap-6">
                <Link href={logoHref} className="shrink-0" onClick={() => setIsMenuOpen(false)}>
                    <Image
                        src="/brand/jigeumini-logo.png"
                        alt="지금이니?"
                        width={129}
                        height={71}
                        unoptimized
                        className="h-[55px] w-[100px] object-contain lg:h-[71px] lg:w-[129px]"
                    />
                </Link>

                <nav
                    aria-label="주요 메뉴"
                    className={`hidden min-w-0 flex-1 items-center justify-end gap-1 ${hideMenus ? "" : "lg:flex"}`}
                >
                    {HEADER_LINKS.map((link) => {
                        const isActive = isRouteActive(pathname, link.href);

                        return (
                            <Button
                                key={link.href}
                                asChild
                                variant="ghost"
                                className={`hover:text-primary h-auto rounded-lg px-3 py-2 text-[16px] leading-[25px] font-semibold tracking-[0.5px] whitespace-nowrap hover:bg-transparent ${
                                    isActive ? "text-primary" : "text-[#464646]"
                                }`}
                            >
                                <Link href={link.href} aria-current={isActive ? "page" : undefined}>
                                    {link.label}
                                </Link>
                            </Button>
                        );
                    })}
                </nav>

                <div className="typography-body-medium flex shrink-0 items-center justify-end gap-2 lg:w-[120px]">
                    {isProfileLoading ? (
                        <Skeleton
                            role="status"
                            aria-label="로그인 상태 확인 중"
                            className="size-11 rounded-full bg-[#efeeff]"
                        />
                    ) : isLoggedIn && !isAuthPage ? (
                        <Button
                            asChild
                            variant="ghost"
                            size="icon-lg"
                            className={`size-11 rounded-full p-0 ${isProfileActive ? "ring-primary ring-2" : ""}`}
                        >
                            <Link
                                href="/my"
                                onClick={() => setIsMenuOpen(false)}
                                aria-label="프로필"
                                title="프로필"
                                aria-current={isProfileActive ? "page" : undefined}
                            >
                                <ProfileAvatar src={member?.profileImageUrl} size="header" />
                            </Link>
                        </Button>
                    ) : (
                        <Button
                            type="button"
                            onClick={() => {
                                setIsMenuOpen(false);
                                router.push("/login");
                            }}
                            className={`typography-body-medium h-auto rounded-full px-4 py-2.5 font-semibold hover:bg-[#5745e7] focus-visible:!border-[#6653fb] focus-visible:ring-3 focus-visible:!ring-[#6653fb]/30 lg:px-[30px] dark:hover:bg-[#5745e7] ${isOnboardingPage ? "font-brand h-[41px] border-0 text-[14px] leading-[21px]" : ""}`}
                        >
                            로그인
                        </Button>
                    )}
                    {!hideMenus && (
                        <Button
                            ref={menuButtonRef}
                            type="button"
                            variant="ghost"
                            size="icon"
                            aria-label={isMenuOpen ? "메뉴 닫기" : "메뉴 열기"}
                            aria-expanded={isMenuOpen}
                            aria-controls="mobile-header-menu"
                            onClick={() => setIsMenuOpen((open) => !open)}
                            className="size-10 shrink-0 rounded-lg text-[#545d82] lg:hidden"
                        >
                            {isMenuOpen ? (
                                <X aria-hidden="true" className="size-5" />
                            ) : (
                                <Menu aria-hidden="true" className="size-5" />
                            )}
                        </Button>
                    )}
                </div>
            </div>
            {!hideMenus && (
                <nav
                    id="mobile-header-menu"
                    aria-label="모바일 주요 메뉴"
                    className={`${isMenuOpen ? "grid" : "hidden"} layout-container grid-cols-2 gap-2 border-t border-[#eef0f5] py-3 lg:hidden`}
                    onKeyDown={(event) => {
                        if (event.key === "Escape") {
                            setIsMenuOpen(false);
                            menuButtonRef.current?.focus();
                        }
                    }}
                >
                    {HEADER_LINKS.map((link) => {
                        const isActive = isRouteActive(pathname, link.href);
                        return (
                            <Button
                                key={link.href}
                                asChild
                                variant="ghost"
                                className={`h-11 justify-start rounded-lg px-4 text-sm font-semibold ${isActive ? "text-primary bg-[#f0edff]" : "text-[#464646]"}`}
                            >
                                <Link
                                    href={link.href}
                                    aria-current={isActive ? "page" : undefined}
                                    onClick={() => setIsMenuOpen(false)}
                                >
                                    {link.label}
                                </Link>
                            </Button>
                        );
                    })}
                </nav>
            )}
        </header>
    );
}
