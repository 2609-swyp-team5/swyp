"use client";

import type { SubmitHandler, UseFormReturn } from "react-hook-form";
import Link from "next/link";
import { CircleAlert } from "lucide-react";

import { Button } from "@/common/components/ui/Button";
import { Checkbox } from "@/common/components/ui/Checkbox";
import { Input } from "@/common/components/ui/Input";
import { Label } from "@/common/components/ui/Label";
import { PasswordResetModal } from "@/features/auth/components/PasswordResetModal";
import { PasswordField } from "@/features/auth/components/shared/PasswordField";
import type { LoginRequest } from "@/features/auth/types";

const labelClassName =
    "typography-body-medium text-[length:var(--type-body-medium-size)] leading-[30px] font-semibold text-[#363636]";
const fieldErrorClassName = "mt-2 text-[13px] leading-5 text-[#fa503d]";

type LoginFormProps = {
    form: UseFormReturn<LoginRequest>;
    onSubmit: SubmitHandler<LoginRequest>;
    isBusy: boolean;
    showPassword: boolean;
    onPasswordVisibilityChange: (visible: boolean) => void;
    rememberEmail: boolean;
    onRememberEmailChange: (checked: boolean | "indeterminate") => void;
};

export function LoginForm({
    form,
    onSubmit,
    isBusy,
    showPassword,
    onPasswordVisibilityChange,
    rememberEmail,
    onRememberEmailChange,
}: LoginFormProps) {
    const {
        register,
        handleSubmit,
        formState: { errors },
    } = form;

    return (
        <>
            <form
                id="login-form"
                noValidate
                onSubmit={handleSubmit(onSubmit)}
                className="mt-[30px]"
            >
                <fieldset disabled={isBusy} className="space-y-5">
                    <div>
                        <Label className={`${labelClassName} mb-2`} htmlFor="email">
                            이메일
                        </Label>
                        <Input
                            id="email"
                            {...register("email")}
                            aria-invalid={Boolean(errors.email)}
                            aria-describedby={errors.email ? "email-error" : undefined}
                            type="email"
                            autoComplete="email"
                            placeholder="이메일 주소를 입력해주세요"
                            className="text-foreground aria-invalid:focus-visible:border-destructive h-12 rounded-xl px-4 text-base focus-visible:border-[#6653fb] focus-visible:ring-0 md:text-base"
                        />
                        {errors.email ? (
                            <p id="email-error" role="alert" className={fieldErrorClassName}>
                                {errors.email.message}
                            </p>
                        ) : null}
                    </div>

                    <div>
                        <Label className={`${labelClassName} mb-2`} htmlFor="password">
                            비밀번호
                        </Label>
                        <PasswordField
                            id="password"
                            {...register("password")}
                            aria-invalid={Boolean(errors.password)}
                            aria-describedby={errors.password ? "password-error" : "password-hint"}
                            autoComplete="current-password"
                            placeholder="8자 이상, 영문/숫자 조합"
                            showPassword={showPassword}
                            onVisibilityChange={onPasswordVisibilityChange}
                            visibilityLabel="비밀번호"
                        />
                        {errors.password ? (
                            <p id="password-error" role="alert" className={fieldErrorClassName}>
                                {errors.password.message}
                            </p>
                        ) : (
                            <p
                                id="password-hint"
                                className="mt-2 flex items-center gap-2.5 text-[13px] leading-5 font-semibold tracking-[-0.5px] text-[#fa503d]"
                            >
                                <CircleAlert
                                    aria-hidden="true"
                                    className="relative -top-px size-[15px] shrink-0"
                                />
                                비밀번호는 영문, 숫자, 특수문자를 포함해야 합니다.
                            </p>
                        )}
                    </div>
                </fieldset>
            </form>

            <Button
                type="submit"
                form="login-form"
                disabled={isBusy}
                className="typography-body-medium bg-primary text-primary-foreground mt-[60px] h-[70px] w-full rounded-lg text-lg leading-[30px] font-semibold hover:bg-[#5745e7] focus-visible:!border-[#6653fb] focus-visible:ring-3 focus-visible:!ring-[#6653fb]/30 dark:bg-[#6653fb] dark:text-white dark:hover:bg-[#5745e7]"
            >
                {isBusy ? "로그인 중..." : "로그인하기"}
            </Button>

            <div className="mt-5 flex flex-wrap items-center justify-between gap-x-5 gap-y-3 text-base leading-[25px] font-semibold tracking-[0.5px]">
                <div className="flex flex-wrap items-center gap-4 sm:gap-6">
                    <div className="flex items-center gap-2">
                        <Checkbox
                            id="remember-login"
                            checked={rememberEmail}
                            onCheckedChange={onRememberEmailChange}
                            disabled={isBusy}
                            className="size-6 border-[#d3d3d3] bg-white data-[state=checked]:border-[#272727] data-[state=checked]:bg-[#272727] data-[state=checked]:text-white dark:bg-white dark:data-[state=checked]:bg-[#272727]"
                        />
                        <Label
                            htmlFor="remember-login"
                            className="text-base leading-[25px] font-semibold text-[#6b6c7b]"
                        >
                            아이디 저장
                        </Label>
                    </div>
                    <span aria-hidden="true" className="hidden h-6 w-px bg-[#d3d3d3] sm:block" />
                    <PasswordResetModal />
                </div>
                <p className="flex items-center gap-[6px] px-2.5 text-[#6b6c7b]">
                    <span>회원이 아니신가요?</span>
                    <Link
                        href="/signup"
                        className="text-primary underline underline-offset-2 dark:text-[#6653fb]"
                    >
                        회원가입
                    </Link>
                </p>
            </div>
        </>
    );
}
