"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff } from "lucide-react";

import { Button } from "@/common/components/ui/Button";
import { Input } from "@/common/components/ui/Input";
import { Label } from "@/common/components/ui/Label";
import { MyPageContent, MyPanel } from "@/features/my/components/MyPageContent";
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
import type { PasswordChangeRequest } from "@/features/member/types";

const fields = [
    { name: "currentPassword", label: "기존 비밀번호", autoComplete: "current-password" },
    { name: "newPassword", label: "변경할 비밀번호", autoComplete: "new-password" },
] as const;

export default function MyPasswordPage() {
    const [visible, setVisible] = useState({ currentPassword: false, newPassword: false });
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
    } = useForm<PasswordChangeRequest>({
        resolver: zodResolver(passwordChangeSchema),
        defaultValues: { currentPassword: "", newPassword: "" },
    });

    return (
        <MyPageContent eyebrow="계정 설정" title="비밀번호 변경">
            <MyPanel className="w-full p-6 sm:p-8">
                <form
                    noValidate
                    onSubmit={handleSubmit((values) => {
                        if (isPending || isSuccess) return;
                        changePassword(values, {
                            onSuccess: () => {
                                reset();
                                setVisible({ currentPassword: false, newPassword: false });
                            },
                        });
                    })}
                    onChange={() => {
                        if (error) resetMutation();
                    }}
                    className="space-y-7"
                >
                    {fields.map(({ name, label, autoComplete }) => (
                        <div key={name} className="space-y-2">
                            <Label htmlFor={name} className="text-[13px] font-semibold">
                                {label}
                            </Label>
                            <div className="relative">
                                <Input
                                    id={name}
                                    {...register(name)}
                                    type={visible[name] ? "text" : "password"}
                                    autoComplete={autoComplete}
                                    placeholder={`${label}를 입력해 주세요`}
                                    required
                                    disabled={isPending || isSuccess}
                                    aria-invalid={Boolean(errors[name])}
                                    aria-describedby={
                                        errors[name]
                                            ? `${name}-error`
                                            : name === "newPassword"
                                              ? "password-hint"
                                              : undefined
                                    }
                                    className="h-12 rounded-xl pr-12 pl-4 text-base md:text-base"
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
                            {name === "newPassword" ? (
                                <p
                                    id="password-hint"
                                    className="text-muted-foreground text-[13px] leading-5"
                                >
                                    영문과 숫자를 포함해 8~64자로 입력해 주세요.
                                </p>
                            ) : null}
                        </div>
                    ))}
                    <Button
                        type="submit"
                        disabled={isPending || isSuccess}
                        className="h-[50px] w-full rounded-xl text-base font-semibold"
                    >
                        {isPending ? "변경 중..." : "비밀번호 변경"}
                    </Button>
                    {error ? (
                        <p role="alert" className="text-destructive text-center text-[13px]">
                            {getApiErrorMessage(error)}
                        </p>
                    ) : null}
                </form>
            </MyPanel>
            <AlertDialog
                open={isSuccess}
                onOpenChange={(open) => {
                    if (!open && isSuccess) clearAuth();
                }}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>비밀번호가 변경되었습니다.</AlertDialogTitle>
                        <AlertDialogDescription>
                            변경한 비밀번호로 다시 로그인해 주세요.
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
