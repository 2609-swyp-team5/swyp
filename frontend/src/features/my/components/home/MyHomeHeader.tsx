"use client";

import Image from "next/image";
import { Button } from "@/common/components/ui/Button";

type MyHomeHeaderProps = {
    nickname?: string;
    isError: boolean;
    isFetching: boolean;
    onRetry: () => void;
};

export function MyHomeHeader({ nickname, isError, isFetching, onRetry }: MyHomeHeaderProps) {
    return (
        <>
            <header className="flex flex-col-reverse items-center gap-[30px] px-[10px] text-center sm:flex-row sm:items-end sm:text-left">
                <div className="min-w-0 break-keep">
                    <p className="text-[20px] leading-[30px] font-semibold tracking-[0.5px] text-[#83889e]">
                        AI와 함께하는 똑똑한 중고거래
                    </p>
                    <h1 className="mt-[10px] text-[44px] leading-[52px] font-bold tracking-[0.5px] text-[#464646]">
                        {nickname !== undefined ? `안녕하세요, ${nickname}님` : "안녕하세요"}
                    </h1>
                </div>
                <div className="relative h-[199px] w-[235px] shrink-0 overflow-hidden">
                    <Image
                        src="/my/home/mascot.png"
                        alt=""
                        width={248}
                        height={248}
                        priority
                        className="absolute -top-[14px] -left-[13px] max-w-none -scale-x-100"
                    />
                </div>
            </header>

            {isError ? (
                <div className="mt-6 flex items-center gap-3 px-[10px]">
                    <p role="alert" className="text-[13px] text-[#6b7395]">
                        회원정보를 불러오지 못했습니다.
                    </p>
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={isFetching}
                        onClick={onRetry}
                        className="hover:border-[#6653fb] hover:bg-[#fafbff] hover:text-[#6653fb] focus-visible:!border-[#6653fb] focus-visible:ring-3 focus-visible:!ring-[#6653fb]/30 dark:hover:bg-[#fafbff]"
                    >
                        다시 시도
                    </Button>
                </div>
            ) : null}
        </>
    );
}
