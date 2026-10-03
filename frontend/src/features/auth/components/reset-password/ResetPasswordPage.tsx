"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";

import { getApiErrorMessage } from "@/common/lib/api/error";
import {
    ResetPasswordForm,
    type ResetPasswordFormValues,
} from "@/features/auth/components/reset-password/ResetPasswordForm";
import { AuthHeading } from "@/features/auth/components/shared/AuthHeading";
import { AuthResultDialog } from "@/features/auth/components/shared/AuthResultDialog";
import { usePasswordResetConfirmMutation } from "@/features/auth/hooks/mutations/usePasswordResetConfirmMutation";
import { passwordResetConfirmSchema } from "@/features/auth/schemas/authSchema";

export function ResetPasswordPage() {
    const router = useRouter();
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");
    const [successMessage, setSuccessMessage] = useState("");
    const form = useForm<ResetPasswordFormValues>({
        resolver: zodResolver(passwordResetConfirmSchema),
        defaultValues: { newPassword: "", confirmPassword: "" },
    });
    const {
        formState: { isSubmitting },
    } = form;
    const { mutate: confirmReset, isPending } = usePasswordResetConfirmMutation({
        onSuccess: setSuccessMessage,
        onError: (error) => setErrorMessage(getApiErrorMessage(error)),
    });
    const isBusy = isSubmitting || isPending;

    const onSubmit = ({ newPassword }: ResetPasswordFormValues) => {
        setErrorMessage("");
        const resetToken = new URLSearchParams(window.location.search).get("token");
        if (!resetToken) {
            setErrorMessage(
                "재설정 링크가 올바르지 않습니다. 비밀번호 찾기에서 다시 요청해 주세요.",
            );
            return;
        }
        confirmReset({ resetToken, newPassword });
    };

    return (
        <main className="bg-background flex-1 py-16 lg:py-28 dark:bg-white">
            <div className="layout-container">
                <section aria-labelledby="page-title" className="mx-auto w-full max-w-[840px]">
                    <AuthHeading title="비밀번호 재설정" />

                    <ResetPasswordForm
                        form={form}
                        onSubmit={onSubmit}
                        isBusy={isBusy}
                        showNewPassword={showNewPassword}
                        onNewPasswordVisibilityChange={setShowNewPassword}
                        showConfirmPassword={showConfirmPassword}
                        onConfirmPasswordVisibilityChange={setShowConfirmPassword}
                        errorMessage={errorMessage}
                        onErrorClear={() => setErrorMessage("")}
                    />
                </section>
            </div>

            <AuthResultDialog
                open={Boolean(successMessage)}
                onOpenChange={(nextOpen) => {
                    if (!nextOpen) router.replace("/login");
                }}
                title="비밀번호 재설정 완료"
                message={successMessage}
                actionLabel="로그인으로 이동"
            />
        </main>
    );
}
