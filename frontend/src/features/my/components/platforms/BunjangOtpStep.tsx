"use client";

import { useEffect, useState } from "react";

import { Button } from "@/common/components/ui/Button";
import { Input } from "@/common/components/ui/Input";
import { Label } from "@/common/components/ui/Label";
import type { BunjangVerificationResponse } from "@/features/my/types";

const buttonFocusClassName =
    "focus-visible:!border-[#6653fb] focus-visible:ring-3 focus-visible:!ring-[#6653fb]/30";
const fieldClassName =
    "h-[50px] rounded-[8px] border border-[#d3d3d3] bg-[#fafbff] px-4 py-3 text-[16px] leading-[25px] text-[#6b6c7b] shadow-none placeholder:text-[#d3d3d3] focus-visible:border-[#6653fb] focus-visible:ring-0";
const fieldLabelClassName =
    "text-[16px] leading-[25px] font-semibold tracking-[0.5px] text-[#464646]";

type BunjangOtpStepProps = {
    verification: BunjangVerificationResponse;
    isRequestPending: boolean;
    isConfirmPending: boolean;
    onCancel: () => void;
    onRequest: () => void;
    onConfirm: (otp: string, verificationId: string) => void;
};

function formatRemainingTime(seconds: number) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${String(remainingSeconds).padStart(2, "0")}`;
}

export function BunjangOtpStep({
    verification,
    isRequestPending,
    isConfirmPending,
    onCancel,
    onRequest,
    onConfirm,
}: BunjangOtpStepProps) {
    const [otp, setOtp] = useState("");
    const [otpError, setOtpError] = useState<string>();
    const [remainingSeconds, setRemainingSeconds] = useState(verification.expiresInSeconds);
    const isPending = isRequestPending || isConfirmPending;

    useEffect(() => {
        const expiresAt = Date.now() + verification.expiresInSeconds * 1000;
        const timer = window.setInterval(() => {
            setRemainingSeconds(Math.max(0, Math.ceil((expiresAt - Date.now()) / 1000)));
        }, 1000);

        return () => window.clearInterval(timer);
    }, [verification.expiresInSeconds]);

    const confirmVerification = () => {
        if (!/^\d{6}$/.test(otp)) {
            setOtpError("인증번호 6자리를 입력해 주세요.");
            return;
        }
        if (remainingSeconds === 0) {
            setOtpError("인증 시간이 만료되었습니다. 인증번호를 다시 요청해 주세요.");
            return;
        }
        onConfirm(otp, verification.verificationId);
    };

    const requestVerification = () => {
        setOtp("");
        setOtpError(undefined);
        onRequest();
    };

    return (
        <form
            onSubmit={(event) => {
                event.preventDefault();
                if (!isPending) confirmVerification();
            }}
            className="space-y-5"
        >
            <div className="rounded-lg bg-[#fafbff] px-4 py-3 text-sm text-[#6b6c7b]">
                인증번호는 {formatRemainingTime(remainingSeconds)} 동안 유효합니다.
            </div>
            <div className="flex flex-col gap-1.5">
                <Label htmlFor="bunjang-otp" className={fieldLabelClassName}>
                    인증번호
                </Label>
                <Input
                    id="bunjang-otp"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    disabled={isPending}
                    aria-invalid={Boolean(otpError)}
                    value={otp}
                    onChange={(event) => {
                        setOtp(event.target.value.replace(/\D/g, "").slice(0, 6));
                        setOtpError(undefined);
                    }}
                    placeholder="인증번호 6자리"
                    className={fieldClassName}
                />
                {otpError && (
                    <p role="alert" className="text-destructive text-xs">
                        {otpError}
                    </p>
                )}
            </div>
            <div className="flex justify-end gap-2">
                <Button
                    type="button"
                    variant="outline"
                    disabled={isPending}
                    onClick={onCancel}
                    className={buttonFocusClassName}
                >
                    취소
                </Button>
                <Button
                    type="button"
                    variant="outline"
                    disabled={isPending}
                    onClick={requestVerification}
                    className={buttonFocusClassName}
                >
                    {isRequestPending ? "문자 요청 중..." : "인증번호 다시 받기"}
                </Button>
                <Button
                    type="submit"
                    disabled={isPending || remainingSeconds === 0}
                    className={buttonFocusClassName}
                >
                    {isConfirmPending ? "확인 중..." : "인증번호 확인"}
                </Button>
            </div>
        </form>
    );
}
