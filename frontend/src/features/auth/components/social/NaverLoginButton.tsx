"use client";

import Image from "next/image";

import { Button } from "@/common/components/ui/Button";

interface NaverLoginButtonProps {
    isConfigured: boolean;
    isBusy: boolean;
    isRedirecting: boolean;
    onClick: () => void;
}

export function NaverLoginButton({
    isConfigured,
    isBusy,
    isRedirecting,
    onClick,
}: NaverLoginButtonProps) {
    const isDisabled = isBusy || !isConfigured;
    const ariaLabel = !isConfigured
        ? "네이버 로그인 설정 필요"
        : isRedirecting
          ? "네이버 로그인 이동 중"
          : "네이버 계정으로 로그인";

    return (
        <Button
            type="button"
            variant="outline"
            disabled={isDisabled}
            onClick={onClick}
            aria-label={ariaLabel}
            title={ariaLabel}
            className="size-[45.27px] rounded-[10px] border-transparent bg-[#03C75A] p-0 hover:bg-[#03C75A]/80"
        >
            <Image src="/auth/naver.svg" alt="" width={20} height={20} className="scale-[1.2575]" />
        </Button>
    );
}
