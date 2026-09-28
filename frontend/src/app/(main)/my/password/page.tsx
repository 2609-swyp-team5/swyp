"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CircleAlert, Eye, EyeOff } from "lucide-react";
import { z } from "zod";

import { Button } from "@/common/components/ui/Button";
import { Input } from "@/common/components/ui/Input";
import { Label } from "@/common/components/ui/Label";
import { MyPageContent } from "@/features/my/components/MyPageContent";
import {
    AlertDialog,
    AlertDialogContent,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogAction,
} from "@/common/components/ui/AlertDialog";
import { getApiErrorMessage } from "@/common/lib/api/error";
import { useAuthStore } from "@/features/auth/store/authStore";
import { useChangePasswordMutation } from "@/features/member/hooks/mutations/useChangePasswordMutation";
import { passwordChangeSchema } from "@/features/member/schemas/memberSchema";
const fields = [
    { name: "currentPassword", label: "기존 비밀번호", autoComplete: "current-password" },
    { name: "newPassword", label: "새 비밀번호", autoComplete: "new-password" },
    { name: "confirmPassword", label: "새 비밀번호 확인", autoComplete: "new-password" },
] as const;

const passwordChangeFormSchema = passwordChangeSchema
    .extend({
        confirmPassword: z.string().min(1, "새 비밀번호를 다시 입력해 주세요."),
    })
    .refine((values) => values.newPassword === values.confirmPassword, {
        path: ["confirmPassword"],
        message: "새 비밀번호가 일치하지 않습니다.",
    });

export default function MyPasswordPage() {
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
    const {
        register,
        handleSubmit,
        reset,
        formState: { errors },
    } = useForm<z.infer<typeof passwordChangeFormSchema>>({
        resolver: zodResolver(passwordChangeFormSchema),
        defaultValues: { currentPassword: "", newPassword: "", confirmPassword: "" },
    });

    return (
        <MyPageContent
            eyebrow=""
            title="비밀번호 변경"
            eyebrowClassName="hidden"
            titleClassName="text-[32px] leading-[42px] tracking-[0.5px] text-[#363636] sm:text-[40px] sm:leading-[50px] xl:text-[53px] xl:leading-[75px]"
        >
            <div className="pt-10">
                <form
                    noValidate
                    onSubmit={handleSubmit((values) => {
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
                    })}
                    onChange={() => {
                        if (error) resetMutation();
                    }}
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
                                        className="h-[45px] rounded-[6px] border-[#dde5e9] bg-white pr-12 pl-5 text-[16px] placeholder:text-[#6b7588] md:text-[16px]"
                                    />
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        disabled={isPending || isSuccess}
                                        aria-label={`${label} ${visible[name] ? "숨기기" : "표시"}`}
                                        aria-pressed={visible[name]}
                                        onClick={() =>
                                            setVisible((previous) => ({
                                                ...previous,
                                                [name]: !previous[name],
                                            }))
                                        }
                                        className="text-muted-foreground absolute top-[calc(50%-1rem)] right-2"
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
                        <p className="font-semibold tracking-[0.5px] text-[#6b6c7b]">
                            비밀번호 조건
                        </p>
                        <p>• 영문과 숫자를 포함해 8~64자로 입력해 주세요.</p>
                        <p>• 새 비밀번호 확인 값과 일치해야 합니다.</p>
                    </div>
                    <div className="flex justify-end pt-10">
                        <Button
                            type="submit"
                            disabled={isPending || isSuccess}
                            className="h-[41px] min-w-[160px] rounded-full bg-[#6653fb] px-6 text-[14px] font-semibold text-white hover:bg-[#5844e8]"
                        >
                            {isPending ? "변경 중..." : "비밀번호 변경"}
                        </Button>
                    </div>
                </form>
            </div>
            <AlertDialog
                open={isSuccess || Boolean(error)}
                onOpenChange={(open) => {
                    if (!open && isSuccess) clearAuth();
                    else if (!open) resetMutation();
                }}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            {isSuccess ? "비밀번호가 변경되었습니다." : "비밀번호 변경 실패"}
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            {isSuccess
                                ? "변경한 비밀번호로 다시 로그인해 주세요."
                                : getApiErrorMessage(error)}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogAction>확인</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </MyPageContent>
    );
}
