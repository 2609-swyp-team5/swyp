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
            <header className="flex flex-col-reverse items-center gap-5 text-center sm:flex-row sm:justify-between sm:text-left">
                <div className="flex min-w-0 flex-col gap-[10px] tracking-[0.5px] break-keep">
                    <p className="typography-heading-03 font-medium text-[#83889e]">
                        AI와 함께하는 똑똑한 중고거래
                    </p>
                    <h1 className="typography-heading-01 font-bold text-[#464646]">
                        {nickname !== undefined ? `안녕하세요, ${nickname}님` : "안녕하세요"}
                    </h1>
                </div>
                <div className="relative h-[120px] w-[136px] shrink-0 sm:h-[282px] sm:w-[318px]">
                    <Image
                        src="/my/home/mascot.png"
                        alt=""
                        fill
                        sizes="318px"
                        priority
                        className="-scale-x-100 object-cover"
                    />
                </div>
            </header>

            {isError ? (
                <div className="mt-6 flex items-center gap-3">
                    <p role="alert" className="typography-body-small text-[#6b7395]">
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
