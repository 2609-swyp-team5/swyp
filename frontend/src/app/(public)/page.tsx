"use client";

import Link from "next/link";

import { useAuthStore } from "@/features/auth/store/authStore";

export default function OnboardingPage() {
    const isLoggedIn = useAuthStore((state) => state.isLoggedIn);

    return (
        <main className="bg-background flex-1">
            <section className="mx-auto flex min-h-[520px] w-full max-w-7xl items-center px-6 py-20 lg:px-8">
                <div className="max-w-2xl">
                    <p className="text-primary text-sm font-semibold tracking-wide uppercase">
                        AI와 함께하는 똑똑한 중고거래
                    </p>
                    <h1 className="text-foreground mt-4 text-5xl leading-tight font-bold tracking-tight">
                        지금 팔까, 더 갖고 있을까?
                    </h1>
                    <p className="text-muted-foreground mt-6 max-w-xl text-lg leading-8">
                        서비스 이용을 시작하는 온보딩 화면입니다.
                    </p>
                    <div className="mt-8 flex flex-wrap gap-3">
                        <Link
                            href={isLoggedIn ? "/home" : "/login"}
                            className="bg-primary text-primary-foreground rounded-full px-6 py-3 font-semibold"
                        >
                            시작하기
                        </Link>
                    </div>
                </div>
            </section>
        </main>
    );
}
