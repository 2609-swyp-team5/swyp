"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, Pencil } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/common/components/ui/Avatar";
import { Button } from "@/common/components/ui/Button";
import { getApiErrorMessage } from "@/common/lib/api/error";
import { cn } from "@/common/lib/utils";
import { useLogoutMutation } from "@/features/auth/hooks/mutations/useLogoutMutation";
import { useMeQuery } from "@/features/member/hooks/queries/useMeQuery";

const MY_NAVIGATION = [
    { href: "/my", label: "홈" },
    { href: "/my/settings", label: "사용자 정보 설정" },
    { href: "/my/password", label: "비밀번호 변경" },
    { href: "/my/notifications", label: "알림 설정" },
    { href: "/my/products", label: "등록된 상품 확인" },
    { href: "/my/platforms", label: "플랫폼 별 연동 확인" },
    { href: "/my/withdraw", label: "회원 탈퇴" },
] as const;

export function MySidebar() {
    const pathname = usePathname();
    const { data: member } = useMeQuery();
    const [errorMessage, setErrorMessage] = useState("");
    const { mutate: logout, isPending: isLoggingOut } = useLogoutMutation({
        onError: (error) => setErrorMessage(getApiErrorMessage(error)),
    });
    return (
        <aside className="flex flex-col bg-[#272727] py-8 lg:w-[min(28vw,400px)] lg:shrink-0 lg:py-[50px]">
            <div className="flex flex-col items-center gap-5 border-b border-white/10 px-6 pb-6">
                <Avatar className="size-[70px] after:border-0">
                    {member?.profileImageUrl ? (
                        <AvatarImage src={member.profileImageUrl} alt="프로필 사진" />
                    ) : null}
                    <AvatarFallback className="bg-primary text-primary-foreground text-base font-semibold">
                        {member?.nickname[0] ?? "?"}
                    </AvatarFallback>
                </Avatar>
                <div className="text-center">
                    <p className="typography-body-medium font-semibold text-white">
                        {member?.nickname ?? "회원"}
                    </p>
                    <Link
                        href="/my/settings"
                        className="mx-auto flex w-fit items-center gap-1 text-[13px] leading-5 text-white/50 underline underline-offset-2 hover:text-white"
                    >
                        프로필 보기 <Pencil className="size-3" aria-hidden="true" />
                    </Link>
                </div>
            </div>
            <nav aria-label="마이페이지 메뉴" className="flex flex-1 flex-col">
                <div className="mt-8 mb-5 grid grid-cols-2 gap-y-2 sm:grid-cols-3 lg:mt-[60px] lg:flex lg:flex-col lg:gap-5">
                    {MY_NAVIGATION.map((item) => {
                        const active =
                            item.href === "/my"
                                ? pathname === "/my"
                                : pathname.startsWith(item.href);
                        const className = cn(
                            "typography-body-medium h-auto min-h-[50px] w-full rounded-none px-3 py-2 text-center text-[length:var(--type-body-medium-size)] font-semibold whitespace-normal",
                            active
                                ? "bg-[#dedee6] text-primary hover:bg-[#dedee6]"
                                : "text-[#a1a5b7] hover:bg-white/5 hover:text-white",
                        );
                        return (
                            <Button key={item.label} asChild variant="ghost" className={className}>
                                <Link href={item.href} aria-current={active ? "page" : undefined}>
                                    {item.label}
                                </Link>
                            </Button>
                        );
                    })}
                </div>
                <div className="space-y-5 px-6">
                    {errorMessage ? (
                        <p role="alert" className="text-sm text-red-300">
                            {errorMessage}
                        </p>
                    ) : null}
                    <Button
                        type="button"
                        variant="ghost"
                        disabled={isLoggingOut}
                        onClick={() => {
                            setErrorMessage("");
                            logout();
                        }}
                        className="h-12 w-full gap-2 border-t border-white/10 text-base text-white/60 hover:bg-white/5 hover:text-white"
                    >
                        <LogOut className="size-4" aria-hidden="true" />
                        {isLoggingOut ? "로그아웃 중..." : "로그아웃"}
                    </Button>
                </div>
            </nav>
        </aside>
    );
}
