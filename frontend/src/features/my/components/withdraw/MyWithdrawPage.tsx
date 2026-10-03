"use client";

import { useState } from "react";

import { MyPageContent } from "@/features/my/components/MyPageContent";
import { getApiErrorMessage } from "@/common/lib/api/error";
import { useWithdrawMutation } from "@/features/member/hooks/mutations/useWithdrawMutation";
import { useAuthStore } from "@/features/auth/store/authStore";

import { WithdrawalContent } from "@/features/my/components/withdraw/WithdrawalContent";
import { WithdrawalDialog } from "@/features/my/components/withdraw/WithdrawalDialog";

export function MyWithdrawPage() {
    const [agreedToGuidance, setAgreedToGuidance] = useState(false);
    const [agreedToDeletion, setAgreedToDeletion] = useState(false);
    const [open, setOpen] = useState(false);
    const { mutate: withdraw, isPending, isSuccess, error, reset } = useWithdrawMutation();
    const clearAuth = useAuthStore((state) => state.clearAuth);
    const agreed = agreedToGuidance && agreedToDeletion;
    const confirming = !isSuccess && !error;

    return (
        <MyPageContent
            eyebrow="계정 관리"
            title="회원 탈퇴"
            eyebrowClassName="text-[20px] leading-[30px] font-semibold tracking-[0.5px] text-[#83889e]"
            titleClassName="text-[#363636]"
        >
            <WithdrawalContent
                agreedToGuidance={agreedToGuidance}
                agreedToDeletion={agreedToDeletion}
                agreed={agreed}
                isPending={isPending}
                onGuidanceChange={setAgreedToGuidance}
                onDeletionChange={setAgreedToDeletion}
                onRequest={() => {
                    reset();
                    setOpen(true);
                }}
            />

            <WithdrawalDialog
                open={open}
                agreed={agreed}
                isPending={isPending}
                isSuccess={isSuccess}
                confirming={confirming}
                errorMessage={error ? getApiErrorMessage(error) : ""}
                onOpenChange={(value) => {
                    if (isPending) return;
                    if (!value && isSuccess) clearAuth();
                    else {
                        if (!value) reset();
                        setOpen(value);
                    }
                }}
                onConfirm={() => {
                    if (agreed && !isPending) withdraw();
                }}
            />
        </MyPageContent>
    );
}
