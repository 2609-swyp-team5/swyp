"use client";

import type { SubmitHandler, UseFormReturn } from "react-hook-form";
import Link from "next/link";
import { CircleAlert } from "lucide-react";

import { Button } from "@/common/components/ui/Button";
import { Label } from "@/common/components/ui/Label";
import { PasswordField } from "@/features/auth/components/shared/PasswordField";

const buttonFocusClassName =
    "focus-visible:!border-[#6653fb] focus-visible:ring-3 focus-visible:!ring-[#6653fb]/30";

const labelClassName =
    "typography-body-medium text-[length:var(--type-body-medium-size)] leading-[30px] font-semibold tracking-[0.5px] text-[#363636]";
const fieldErrorClassName = "mt-2 text-[13px] leading-5 text-[#fa503d]";

export interface ResetPasswordFormValues {
    newPassword: string;
    confirmPassword: string;
}

type ResetPasswordFormProps = {
    form: UseFormReturn<ResetPasswordFormValues>;
    onSubmit: SubmitHandler<ResetPasswordFormValues>;
    isBusy: boolean;
    showNewPassword: boolean;
    onNewPasswordVisibilityChange: (visible: boolean) => void;
    showConfirmPassword: boolean;
    onConfirmPasswordVisibilityChange: (visible: boolean) => void;
    errorMessage: string;
    onErrorClear: () => void;
};

export function ResetPasswordForm({
    form,
    onSubmit,
    isBusy,
    showNewPassword,
    onNewPasswordVisibilityChange,
    showConfirmPassword,
    onConfirmPasswordVisibilityChange,
    errorMessage,
    onErrorClear,
}: ResetPasswordFormProps) {
    const {
        register,
        handleSubmit,
        formState: { errors },
    } = form;

    return (
        <form noValidate onSubmit={handleSubmit(onSubmit)} className="mt-[87px]">
            <fieldset disabled={isBusy} className="space-y-5">
                <div>
                    <Label htmlFor="new-password" className={`${labelClassName} mb-[5px]`}>
                        새 비밀번호
                    </Label>
                    <PasswordField
                        id="new-password"
                        {...register("newPassword", {
                            onChange: onErrorClear,
                        })}
                        autoComplete="new-password"
                        placeholder="새 비밀번호를 입력해 주세요"
                        aria-invalid={Boolean(errors.newPassword)}
                        aria-describedby={errors.newPassword ? "new-password-error" : undefined}
                        showPassword={showNewPassword}
                        onVisibilityChange={onNewPasswordVisibilityChange}
                        visibilityLabel="새 비밀번호"
                    />
                    {errors.newPassword ? (
                        <p id="new-password-error" role="alert" className={fieldErrorClassName}>
                            {errors.newPassword.message}
                        </p>
                    ) : null}
                </div>

                <div>
                    <Label htmlFor="confirm-password" className={`${labelClassName} mb-[5px]`}>
                        새 비밀번호 확인
                    </Label>
                    <PasswordField
                        id="confirm-password"
                        {...register("confirmPassword", {
                            onChange: onErrorClear,
                        })}
                        autoComplete="new-password"
                        placeholder="비밀번호를 확인해 주세요"
                        aria-invalid={Boolean(errors.confirmPassword)}
                        aria-describedby={
                            errors.confirmPassword ? "confirm-password-error" : undefined
                        }
                        showPassword={showConfirmPassword}
                        onVisibilityChange={onConfirmPasswordVisibilityChange}
                        visibilityLabel="새 비밀번호 확인"
                    />
                    {errors.confirmPassword ? (
                        <p id="confirm-password-error" role="alert" className={fieldErrorClassName}>
                            {errors.confirmPassword.message}
                        </p>
                    ) : null}
                    <p className="mt-[5px] flex items-center gap-2 text-[13px] leading-5 font-semibold tracking-[-0.5px] text-[#fa503d]">
                        <CircleAlert
                            aria-hidden="true"
                            className="relative -top-px size-4 shrink-0"
                        />
                        {showNewPassword || showConfirmPassword
                            ? "비밀번호 표시 모드가 활성화되어 있습니다."
                            : "비밀번호 숨김 모드가 활성화되어 있습니다."}
                    </p>
                </div>
            </fieldset>

            <div className="mt-10 space-y-2 rounded-md bg-[#fafbff] p-4 text-base leading-[25px]">
                <p className="font-semibold tracking-[0.5px] text-[#6b6c7b]">비밀번호 조건</p>
                <p className="text-[#6b7588]">• 영문과 숫자를 포함해 8~64자</p>
                <p className="text-[#6b7588]">• 재설정 링크는 한 번만 사용할 수 있습니다.</p>
            </div>

            {errorMessage ? (
                <p role="alert" className="mt-5 text-[13px] leading-5 text-[#fa503d]">
                    {errorMessage}
                </p>
            ) : null}

            <div className="mt-[60px] flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <Button
                    asChild
                    variant="outline"
                    className={`h-11 rounded-full border-[#dedee6] bg-white px-10 text-lg font-semibold text-[#6b7588] dark:border-[#dedee6] dark:bg-white ${buttonFocusClassName} hover:bg-[#c6c6c6] hover:text-white dark:hover:bg-[#c6c6c6] dark:hover:text-white`}
                >
                    <Link href="/login">취소</Link>
                </Button>
                <Button
                    type="submit"
                    disabled={isBusy}
                    className={`h-11 rounded-full px-6 text-lg font-semibold sm:w-[160px] dark:bg-[#6653fb] ${buttonFocusClassName} hover:bg-[#5745e7] dark:hover:bg-[#5745e7]`}
                >
                    {isBusy ? "재설정 중..." : "비밀번호 재설정"}
                </Button>
            </div>
        </form>
    );
}
