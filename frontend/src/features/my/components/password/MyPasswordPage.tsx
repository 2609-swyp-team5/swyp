"use client";

import { useState } from "react";
import { useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { MyPageContent } from "@/features/my/components/MyPageContent";
import { getApiErrorMessage } from "@/common/lib/api/error";
import { useAuthStore } from "@/features/auth/store/authStore";
import { useChangePasswordMutation } from "@/features/member/hooks/mutations/useChangePasswordMutation";
import { passwordChangeSchema } from "@/features/member/schemas/memberSchema";
import {
    MyPasswordForm,
    type PasswordChangeFormValues,
} from "@/features/my/components/password/MyPasswordForm";
import { MyResultDialog } from "@/features/my/components/shared/MyResultDialog";

const passwordChangeFormSchema = passwordChangeSchema
    .extend({
        confirmPassword: z.string().min(1, "새 비밀번호를 다시 입력해 주세요."),
    })
    .refine((values) => values.newPassword === values.confirmPassword, {
        path: ["confirmPassword"],
        message: "새 비밀번호가 일치하지 않습니다.",
    });

export function MyPasswordPage() {
    const [visible, setVisible] = useState({
        currentPassword: false,
        newPassword: false,
        confirmPassword: false,
    });
    const clearAuth = useAuthStore((state) => state.clearAuth);
    const {
        mutate: changePassword,
        isPending,
        isSuccess,
        error,
        reset: resetMutation,
    } = useChangePasswordMutation();
    const form = useForm<PasswordChangeFormValues>({
        resolver: zodResolver(passwordChangeFormSchema),
        defaultValues: { currentPassword: "", newPassword: "", confirmPassword: "" },
    });

    const { reset } = form;
    const onSubmit: SubmitHandler<PasswordChangeFormValues> = (values) => {
        if (isPending || isSuccess) return;
        changePassword(
            {
                currentPassword: values.currentPassword,
                newPassword: values.newPassword,
            },
            {
                onSuccess: () => {
                    reset();
                    setVisible({
                        currentPassword: false,
                        newPassword: false,
                        confirmPassword: false,
                    });
                },
            },
        );
    };

    return (
        <MyPageContent
            eyebrow=""
            title="비밀번호 변경"
            eyebrowClassName="hidden"
            titleClassName="text-[#363636]"
        >
            <MyPasswordForm
                form={form}
                visible={visible}
                isPending={isPending}
                isSuccess={isSuccess}
                onSubmit={onSubmit}
                onChange={() => {
                    if (error) resetMutation();
                }}
                onVisibilityChange={(name) =>
                    setVisible((previous) => ({ ...previous, [name]: !previous[name] }))
                }
            />
            <MyResultDialog
                open={isSuccess || Boolean(error)}
                onOpenChange={(open) => {
                    if (!open && isSuccess) clearAuth();
                    else if (!open) resetMutation();
                }}
                title={isSuccess ? "비밀번호가 변경되었습니다." : "비밀번호 변경 실패"}
                message={
                    isSuccess
                        ? "변경한 비밀번호로 다시 로그인해 주세요."
                        : getApiErrorMessage(error)
                }
            />
        </MyPageContent>
    );
}
