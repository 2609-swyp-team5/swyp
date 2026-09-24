"use client";

import Image from "next/image";

import { Button } from "@/common/components/ui/Button";

interface KakaoLoginButtonProps {
    isConfigured: boolean;
    isBusy: boolean;
    isRedirecting: boolean;
    onClick: () => void;
}

export function KakaoLoginButton({
    isConfigured,
    isBusy,
    isRedirecting,
    onClick,
}: KakaoLoginButtonProps) {
    const isDisabled = isBusy || !isConfigured;
    const ariaLabel = !isConfigured
        ? "카카오 로그인 설정 필요"
        : isRedirecting
          ? "카카오 로그인 이동 중"
          : "카카오 계정으로 로그인";

    return (
        <Button
            type="button"
            variant="outline"
            disabled={isDisabled}
            onClick={onClick}
            aria-label={ariaLabel}
            title={ariaLabel}
            className="size-[45.27px] rounded-[10px] border-transparent bg-[#FEE500] p-0 hover:bg-[#FEE500]/80"
        >
            <Image src="/auth/kakao.svg" alt="" width={20} height={20} className="scale-[1.2575]" />
        </Button>
    );
}
