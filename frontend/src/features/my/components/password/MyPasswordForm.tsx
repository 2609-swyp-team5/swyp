"use client";

import type { SubmitHandler, UseFormReturn } from "react-hook-form";
import { CircleAlert, Eye, EyeOff } from "lucide-react";
import { Button } from "@/common/components/ui/Button";
import { Input } from "@/common/components/ui/Input";
import { Label } from "@/common/components/ui/Label";

const buttonFocusClassName =
    "focus-visible:!border-[#6653fb] focus-visible:ring-3 focus-visible:!ring-[#6653fb]/30";

const fields = [
    { name: "currentPassword", label: "기존 비밀번호", autoComplete: "current-password" },
    { name: "newPassword", label: "새 비밀번호", autoComplete: "new-password" },
    { name: "confirmPassword", label: "새 비밀번호 확인", autoComplete: "new-password" },
] as const;

export type PasswordChangeFormValues = {
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
};
type MyPasswordFormProps = {
    form: UseFormReturn<PasswordChangeFormValues>;
    visible: Record<keyof PasswordChangeFormValues, boolean>;
    isPending: boolean;
    isSuccess: boolean;
    onSubmit: SubmitHandler<PasswordChangeFormValues>;
    onChange: () => void;
    onVisibilityChange: (name: keyof PasswordChangeFormValues) => void;
};

export function MyPasswordForm({
    form,
    visible,
    isPending,
    isSuccess,
    onSubmit,
    onChange,
    onVisibilityChange,
}: MyPasswordFormProps) {
    const {
        register,
        handleSubmit,
        formState: { errors },
    } = form;
    return (
        <form
            noValidate
            onSubmit={handleSubmit(onSubmit)}
            onChange={onChange}
            className="space-y-10"
        >
            <div className="space-y-5">
                {fields.map(({ name, label, autoComplete }) => (
                    <div key={name} className="space-y-[5px]">
                        <Label
                            htmlFor={name}
                            className="text-[20px] leading-[30px] font-semibold tracking-[0.5px] text-[#363636]"
                        >
                            {label}
                        </Label>
                        <div className="relative">
                            <Input
                                id={name}
                                {...register(name)}
                                type={visible[name] ? "text" : "password"}
                                autoComplete={autoComplete}
                                placeholder={
                                    name === "confirmPassword"
                                        ? "비밀번호를 확인해 주세요"
                                        : `${label}를 입력해 주세요`
                                }
                                required
                                disabled={isPending || isSuccess}
                                aria-invalid={Boolean(errors[name])}
                                aria-describedby={
                                    errors[name]
                                        ? `${name}-error`
                                        : name === "newPassword"
                                          ? "password-conditions"
                                          : undefined
                                }
                                className="aria-invalid:focus-visible:border-destructive h-[45px] rounded-[6px] border-[#dde5e9] bg-white pr-12 pl-5 text-[16px] placeholder:text-[#6b7588] focus-visible:border-[#6653fb] focus-visible:ring-0 md:text-[16px]"
                            />
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                disabled={isPending || isSuccess}
                                aria-label={`${label} ${visible[name] ? "숨기기" : "표시"}`}
                                aria-pressed={visible[name]}
                                onClick={() => onVisibilityChange(name)}
                                className={`text-muted-foreground absolute top-[calc(50%-1rem)] right-2 hover:bg-[#efeeff] hover:text-[#6653fb] dark:hover:bg-[#efeeff] ${buttonFocusClassName}`}
                            >
                                {visible[name] ? (
                                    <Eye className="size-5" />
                                ) : (
                                    <EyeOff className="size-5" />
                                )}
                            </Button>
                        </div>
                        {errors[name] ? (
                            <p
                                id={`${name}-error`}
                                role="alert"
                                className="text-destructive text-[13px] leading-5"
                            >
                                {errors[name]?.message}
                            </p>
                        ) : null}
                    </div>
                ))}
                {Object.values(visible).some((value) => !value) && (
                    <p className="flex items-center gap-2 pt-[10px] text-[13px] leading-5 font-semibold tracking-[-0.5px] text-[#fa503d]">
                        <CircleAlert aria-hidden="true" className="size-4 shrink-0" />
                        비밀번호 숨김 모드가 활성화되어 있습니다.
                    </p>
                )}
            </div>
            <div
                id="password-conditions"
                className="space-y-2 rounded-[6px] bg-[#fafbff] p-4 text-[16px] leading-[25px] text-[#6b7588]"
            >
                <p className="font-semibold tracking-[0.5px] text-[#6b6c7b]">비밀번호 조건</p>
                <p>• 영문과 숫자를 포함해 8~64자로 입력해 주세요.</p>
                <p>• 새 비밀번호 확인 값과 일치해야 합니다.</p>
            </div>
            <div className="flex justify-end pt-10">
                <Button
                    type="submit"
                    disabled={isPending || isSuccess}
                    className={`h-[41px] min-w-[160px] rounded-full bg-[#6653fb] px-6 text-[14px] font-semibold text-white hover:bg-[#5745e7] dark:hover:bg-[#5745e7] ${buttonFocusClassName}`}
                >
                    {isPending ? "변경 중..." : "비밀번호 변경"}
                </Button>
            </div>
        </form>
    );
}
