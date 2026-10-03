"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

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
            <div className="layout-container flex min-h-[var(--header-height)] items-center justify-between gap-6 py-2">
                <Link href={logoHref} className="shrink-0">
                    <Image
                        src="/brand/jigeumini-logo.png"
                        alt="지금이니?"
                        width={129}
                        height={71}
                        unoptimized
                        className="h-[71px] w-[129px] object-contain"
                    />
                </Link>

                <nav
                    aria-label="주요 메뉴"
                    className={`flex min-w-0 flex-1 items-center justify-end gap-1 ${hideMenus ? "hidden" : ""}`}
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

                <div className="typography-body-medium flex w-[120px] shrink-0 items-center justify-end gap-2">
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
                            onClick={() => router.push("/login")}
                            className={`typography-body-medium h-auto rounded-full px-[30px] py-2.5 font-semibold hover:bg-[#5745e7] focus-visible:!border-[#6653fb] focus-visible:ring-3 focus-visible:!ring-[#6653fb]/30 dark:hover:bg-[#5745e7] ${isOnboardingPage ? "font-brand h-[41px] border-0 text-[14px] leading-[21px]" : ""}`}
                        >
                            로그인
                        </Button>
                    )}
                </div>
            </div>
        </header>
    );
}
