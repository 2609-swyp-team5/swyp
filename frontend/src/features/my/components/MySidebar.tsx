"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const MY_NAVIGATION = [
    { href: "/my", label: "마이페이지" },
    { href: "/my/settings", label: "사용자 정보 설정" },
    { href: "/my/notifications", label: "알림 설정" },
    { href: "/my/products", label: "등록된 상품" },
    { href: "/my/platforms", label: "플랫폼 연동" },
    { href: "/my/withdraw", label: "회원 탈퇴" },
] as const;

function isMyNavigationActive(pathname: string, href: string) {
    return href === "/my"
        ? pathname === href
        : pathname === href || pathname.startsWith(href + "/");
}

export function MySidebar() {
    const pathname = usePathname();

    return (
        <aside className="border-border bg-background border-b px-6 py-6 md:w-64 md:shrink-0 md:border-r md:border-b-0 md:px-4 md:py-10">
            <nav aria-label="마이페이지 메뉴" className="mx-auto max-w-7xl">
                <p className="text-muted-foreground mb-3 px-3 text-sm font-semibold">마이페이지</p>
                <div className="flex gap-2 overflow-x-auto md:flex-col">
                    {MY_NAVIGATION.map((item) => {
                        const isActive = isMyNavigationActive(pathname, item.href);

                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                aria-current={isActive ? "page" : undefined}
                                className={
                                    isActive
                                        ? "bg-primary/10 text-primary rounded-lg px-3 py-2 text-sm font-semibold whitespace-nowrap transition-colors"
                                        : "text-muted-foreground hover:bg-muted hover:text-foreground rounded-lg px-3 py-2 text-sm whitespace-nowrap transition-colors"
                                }
                            >
                                {item.label}
                            </Link>
                        );
                    })}
                </div>
            </nav>
        </aside>
    );
}
