"use client";

import { useMeQuery } from "@/features/member/hooks/queries/useMeQuery";

import { MyHomeHeader } from "@/features/my/components/home/MyHomeHeader";
import { MySummaryCards } from "@/features/my/components/home/MySummaryCards";

export function MyHomePage() {
    const { data: member, isError, isFetching, refetch } = useMeQuery();

    return (
        <main className="min-w-0 flex-1 bg-white text-[#464646]">
            <div className="bg-gradient-to-b from-[#ededfd] to-white px-6 pt-12 pb-[50px] sm:px-10 xl:px-[100px] xl:pt-[70px]">
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
