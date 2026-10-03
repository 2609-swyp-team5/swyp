"use client";

import type { SubmitHandler, UseFormReturn } from "react-hook-form";
import { CircleAlert } from "lucide-react";

import { Input } from "@/common/components/ui/Input";
import { Label } from "@/common/components/ui/Label";
import { PasswordField } from "@/features/auth/components/shared/PasswordField";
import { SignupEmailField } from "@/features/auth/components/signup/SignupEmailField";
import type { SignUpFormValues } from "@/features/auth/schemas/authSchema";
import type { SignUpRequest } from "@/features/auth/types";

const labelClassName =
    "typography-body-medium text-[length:var(--type-body-medium-size)] leading-[30px] font-semibold text-[#363636]";
const fieldClassName =
    "text-foreground h-12 rounded-xl px-4 text-base md:text-base focus-visible:border-[#6653fb] focus-visible:ring-0 aria-invalid:focus-visible:border-destructive";
const fieldErrorClassName = "mt-2 text-[13px] leading-5 text-[#fa503d]";

type SignupFormProps = {
    form: UseFormReturn<SignUpFormValues, unknown, SignUpRequest>;
    onSubmit: SubmitHandler<SignUpRequest>;
    isBusy: boolean;
    showPassword: boolean;
    onPasswordVisibilityChange: (visible: boolean) => void;
    checkedEmail: string | null;
    isCheckingEmail: boolean;
    onCheckEmail: () => void;
    onEmailChange: () => void;
};

export function SignupForm({
    form,
    onSubmit,
    isBusy,
    showPassword,
    onPasswordVisibilityChange,
    checkedEmail,
    isCheckingEmail,
    onCheckEmail,
    onEmailChange,
}: SignupFormProps) {
    const {
        register,
        handleSubmit,
        formState: { errors },
    } = form;

    return (
        <form id="signup-form" noValidate onSubmit={handleSubmit(onSubmit)} className="mt-[50px]">
            <fieldset disabled={isBusy} className="space-y-5">
                <div>
                    <Label className={`${labelClassName} mb-2`} htmlFor="name">
                        이름
                    </Label>
                    <Input
                        id="name"
                        {...register("name")}
                        aria-invalid={Boolean(errors.name)}
                        aria-describedby={errors.name ? "name-error" : undefined}
                        type="text"
                        autoComplete="name"
                        placeholder="이름을 입력하세요"
                        className={fieldClassName}
                    />
                    {errors.name ? (
                        <p id="name-error" role="alert" className={fieldErrorClassName}>
                            {errors.name.message}
                        </p>
                    ) : null}
                </div>

                <div>
                    <Label className={`${labelClassName} mb-2`} htmlFor="nickname">
                        닉네임
                    </Label>
                    <Input
                        id="nickname"
                        {...register("nickname")}
                        aria-invalid={Boolean(errors.nickname)}
                        aria-describedby={errors.nickname ? "nickname-error" : undefined}
                        type="text"
                        placeholder="닉네임을 입력하세요"
                        className={fieldClassName}
                    />
                    {errors.nickname ? (
                        <p id="nickname-error" role="alert" className={fieldErrorClassName}>
                            {errors.nickname.message}
                        </p>
                    ) : null}
                </div>

                <div>
                    <Label className={`${labelClassName} mb-2`} htmlFor="phone">
                        휴대폰 번호 (선택)
                    </Label>
                    <Input
                        id="phone"
                        {...register("phone")}
                        aria-invalid={Boolean(errors.phone)}
                        aria-describedby={errors.phone ? "phone-error" : undefined}
                        type="tel"
                        autoComplete="tel"
                        placeholder="휴대폰 번호 (- 제외 입력)"
                        className={fieldClassName}
                    />
                    {errors.phone ? (
                        <p id="phone-error" role="alert" className={fieldErrorClassName}>
                            {errors.phone.message}
                        </p>
                    ) : null}
                </div>

                <SignupEmailField
                    registration={register("email", { onChange: onEmailChange })}
                    error={errors.email}
                    checkedEmail={checkedEmail}
                    isCheckingEmail={isCheckingEmail}
                    onCheckEmail={onCheckEmail}
                />

                <div>
                    <Label className={`${labelClassName} mb-2`} htmlFor="password">
                        비밀번호
                    </Label>
                    <PasswordField
                        id="password"
                        {...register("password")}
                        aria-invalid={Boolean(errors.password)}
                        aria-describedby={errors.password ? "password-error" : "password-hint"}
                        autoComplete="new-password"
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
                            <CircleAlert aria-hidden="true" className="size-[15px] shrink-0" />
                            비밀번호는 영문과 숫자를 포함해 8~64자로 입력해 주세요.
                        </p>
                    )}
                </div>
            </fieldset>
        </form>
    );
}
