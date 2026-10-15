"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { Bell, Menu, X } from "lucide-react";

import { Button } from "@/common/components/ui/Button";
import { Skeleton } from "@/common/components/ui/Skeleton";
import {
    AUTH_PAGES,
    isRouteActive,
    useMainNavigationVisible,
} from "@/common/components/layout/useMainNavigationVisible";
import { HEADER_LINKS } from "@/constants/routes";
import { useAuthStore } from "@/features/auth/store/authStore";
import { ProfileAvatar } from "@/features/member/components/ProfileAvatar";
import { useMeQuery } from "@/features/member/hooks/queries/useMeQuery";
import { useUnreadNotificationCountQuery } from "@/features/notifications/hooks/queries/useUnreadNotificationCountQuery";

function HeaderLinkLabel({
    href,
    label,
    unreadCount,
}: {
    href: string;
    label: string;
    unreadCount: number;
}) {
    const showNotificationCount = href === "/notifications" && unreadCount > 0;

    return (
        <span className="inline-flex items-center gap-1.5">
            {label}
            {showNotificationCount ? (
                <span
                    aria-label={`${unreadCount}개 읽지 않은 알림`}
                    className="typography-body-small inline-flex min-w-5 items-center justify-center rounded-full bg-[#6653fb] px-1.5 font-bold text-white"
                >
                    {unreadCount > 99 ? "99+" : unreadCount}
                </span>
            ) : null}
        </span>
    );
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
    const { data: unreadNotification } = useUnreadNotificationCountQuery();
    const unreadNotificationCount = unreadNotification?.count ?? 0;
    const isAuthPage = AUTH_PAGES.includes(pathname);
    const hideMenus = !useMainNavigationVisible();
    const isNotificationActive = isRouteActive(pathname, "/notifications");
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
                        loading="eager"
                        unoptimized
                        className="h-[44px] w-[80px] object-contain md:h-[55px] md:w-[100px] lg:h-[71px] lg:w-[129px]"
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
                                className={`hover:text-primary typography-body-bold h-auto rounded-lg px-3 py-2 font-semibold whitespace-nowrap hover:bg-transparent ${
                                    isActive ? "text-primary" : "text-[#464646]"
                                }`}
                            >
                                <Link href={link.href} aria-current={isActive ? "page" : undefined}>
                                    <HeaderLinkLabel
                                        href={link.href}
                                        label={link.label}
                                        unreadCount={unreadNotificationCount}
                                    />
                                </Link>
                            </Button>
                        );
                    })}
                </nav>

                <div className="typography-body-medium flex shrink-0 items-center justify-end gap-2 lg:w-[120px]">
                    {!hideMenus && isLoggedIn && (
                        // 모바일은 하단 탭바에 알림이 없어 헤더에 알림 바로가기를 둔다
                        <Link
                            href="/notifications"
                            aria-label={
                                unreadNotificationCount > 0
                                    ? `알림, 읽지 않은 알림 ${unreadNotificationCount}개`
                                    : "알림"
                            }
                            aria-current={isNotificationActive ? "page" : undefined}
                            className={`relative flex size-10 items-center justify-center rounded-full md:hidden ${
                                isNotificationActive ? "text-[#6653fb]" : "text-[#545d82]"
                            }`}
                        >
                            <Bell aria-hidden="true" className="size-6" />
                            {unreadNotificationCount > 0 ? (
                                <span className="typography-caption absolute top-1 right-0.5 inline-flex min-w-[18px] items-center justify-center rounded-full bg-[#6653fb] px-1 font-bold text-white">
                                    {unreadNotificationCount > 99 ? "99+" : unreadNotificationCount}
                                </span>
                            ) : null}
                        </Link>
                    )}
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
                            className={`size-9 rounded-full p-0 md:size-11 ${isProfileActive ? "ring-primary ring-2" : ""}`}
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
                    ) : isAuthPage ? null : (
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
                            className="hidden size-10 shrink-0 rounded-lg text-[#545d82] md:inline-flex lg:hidden"
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
                    className={`${isMenuOpen ? "hidden md:grid" : "hidden"} layout-container grid-cols-2 gap-2 border-t border-[#eef0f5] py-3 lg:hidden`}
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
                                className={`typography-body-bold-small h-11 justify-start rounded-lg px-4 font-semibold ${isActive ? "text-primary bg-[#f0edff]" : "text-[#464646]"}`}
                            >
                                <Link
                                    href={link.href}
                                    aria-current={isActive ? "page" : undefined}
                                    onClick={() => setIsMenuOpen(false)}
                                >
                                    <HeaderLinkLabel
                                        href={link.href}
                                        label={link.label}
                                        unreadCount={unreadNotificationCount}
                                    />
                                </Link>
                            </Button>
                        );
                    })}
                </nav>
            )}
        </header>
    );
}
