"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { House, Package, PlusCircle, Search, Sparkles, type LucideIcon } from "lucide-react";

import {
    isRouteActive,
    useMainNavigationVisible,
} from "@/common/components/layout/useMainNavigationVisible";

const TABS: { href: string; label: string; icon: LucideIcon }[] = [
    { href: "/home", label: "홈", icon: House },
    { href: "/search", label: "검색", icon: Search },
    { href: "/ai", label: "AI", icon: Sparkles },
    { href: "/sell/register", label: "등록", icon: PlusCircle },
    { href: "/sell/manage", label: "판매관리", icon: Package },
];

/** 모바일(768px 미만) 하단 탭바. 화면 아래를 가리지 않도록 같은 높이의 빈 공간을 함께 둔다. */
export function MobileTabBar() {
    const pathname = usePathname();
    const visible = useMainNavigationVisible();

    if (!visible) {
        return null;
    }

    return (
        <>
            <div
                aria-hidden="true"
                className="h-[calc(var(--mobile-tab-bar-height)+env(safe-area-inset-bottom))] md:hidden"
            />
            <nav
                aria-label="하단 메뉴"
                className="fixed inset-x-0 bottom-0 z-40 border-t border-[#eef0f5] bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
            >
                <ul className="grid h-[var(--mobile-tab-bar-height)] grid-cols-5">
                    {TABS.map(({ href, label, icon: Icon }) => {
                        const isActive = isRouteActive(pathname, href);
                        return (
                            <li key={href}>
                                <Link
                                    href={href}
                                    aria-current={isActive ? "page" : undefined}
                                    className={`typography-body-small flex h-full flex-col items-center justify-center gap-1 font-semibold ${
                                        isActive ? "text-[#6653fb]" : "text-[#8b8fa3]"
                                    }`}
                                >
                                    <Icon
                                        aria-hidden="true"
                                        className="size-6"
                                        strokeWidth={isActive ? 2.4 : 1.8}
                                    />
                                    {label}
                                </Link>
                            </li>
                        );
                    })}
                </ul>
            </nav>
        </>
    );
}
