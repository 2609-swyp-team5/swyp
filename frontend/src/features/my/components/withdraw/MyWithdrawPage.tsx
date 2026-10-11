"use client";

import { useState } from "react";

import { MyPageContent } from "@/features/my/components/MyPageContent";
import { getApiErrorMessage } from "@/common/lib/api/error";
import { useWithdrawMutation } from "@/features/member/hooks/mutations/useWithdrawMutation";
import { useAuthStore } from "@/features/auth/store/authStore";

import { WithdrawalContent } from "@/features/my/components/withdraw/WithdrawalContent";
import { WithdrawalDialog } from "@/features/my/components/withdraw/WithdrawalDialog";

export function MyWithdrawPage() {
    const [open, setOpen] = useState(false);
    const { mutate: withdraw, isPending, isSuccess, error, reset } = useWithdrawMutation();
    const clearAuth = useAuthStore((state) => state.clearAuth);
    const confirming = !isSuccess && !error;

    return (
        <MyPageContent
            eyebrow="계정 관리"
            title="회원 탈퇴"
            eyebrowClassName="text-[20px] leading-[30px] font-medium tracking-[0.5px] text-[#83889e]"
            titleClassName="leading-[75px] text-[#363636]"
        >
            <WithdrawalContent
                isPending={isPending}
                onRequest={() => {
                    reset();
                    setOpen(true);
                }}
            />

            <WithdrawalDialog
                open={open}
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
                    if (!isPending) withdraw();
                }}
            />
        </MyPageContent>
    );
}
