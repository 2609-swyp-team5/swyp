"use client";

import { useMeQuery } from "@/features/member/hooks/queries/useMeQuery";

import { MyHomeHeader } from "@/features/my/components/home/MyHomeHeader";
import { MySummaryCards } from "@/features/my/components/home/MySummaryCards";

export function MyHomePage() {
    const { data: member, isError, isFetching, refetch } = useMeQuery();

    return (
        // Figma 1854-15372: 흰 배경, 다른 마이페이지와 같은 본문 여백·최대 너비
        <main className="min-w-0 flex-1 bg-white px-6 py-12 text-[#464646] sm:px-10 lg:py-[60px] xl:px-[min(7vw,var(--grid-margin))]">
            <div className="mx-auto w-full max-w-[960px]">
                <MyHomeHeader
                    nickname={member?.nickname}
                    isError={isError}
                    isFetching={isFetching}
                    onRetry={() => void refetch()}
                />
                <MySummaryCards />
            </div>
        </main>
    );
}
