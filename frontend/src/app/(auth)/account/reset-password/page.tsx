"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CircleAlert, Eye, EyeOff } from "lucide-react";

import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/common/components/ui/AlertDialog";
import { Button } from "@/common/components/ui/Button";
import { Input } from "@/common/components/ui/Input";
import { Label } from "@/common/components/ui/Label";
import { getApiErrorMessage } from "@/common/lib/api/error";
import { usePasswordResetConfirmMutation } from "@/features/auth/hooks/mutations/usePasswordResetConfirmMutation";
import { passwordResetConfirmSchema } from "@/features/auth/schemas/authSchema";

interface RecoveryFormValues {
    newPassword: string;
    confirmPassword: string;
}

export default function ResetPasswordPage() {
    const router = useRouter();
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");
    const [successMessage, setSuccessMessage] = useState("");
    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
    } = useForm<RecoveryFormValues>({
        resolver: zodResolver(passwordResetConfirmSchema),
        defaultValues: { newPassword: "", confirmPassword: "" },
    });
    const { mutate: confirmReset, isPending } = usePasswordResetConfirmMutation({
        onSuccess: setSuccessMessage,
        onError: (error) => setErrorMessage(getApiErrorMessage(error)),
    });
    const isBusy = isSubmitting || isPending;

    const onSubmit = ({ newPassword }: RecoveryFormValues) => {
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
                    <div className="text-center">
                        <p className="typography-body-medium leading-[30px] font-semibold text-[#464646]">
                            AI와 함께하는 똑똑한 중고거래
                        </p>
                        <p className="typography-heading-01 text-primary mt-2.5 dark:text-[#6653fb]">
                            지금이니?
                        </p>
                    </div>

                    <h1
                        id="page-title"
                        className="typography-heading-03 mt-20 leading-[42px] font-bold text-[#363636]"
                    >
                        비밀번호 재설정
                    </h1>

                    <form noValidate onSubmit={handleSubmit(onSubmit)} className="mt-[87px]">
                        <fieldset disabled={isBusy} className="space-y-5">
                            <div>
                                <Label
                                    htmlFor="new-password"
                                    className="typography-body-medium mb-[5px] text-[length:var(--type-body-medium-size)] leading-[30px] font-semibold tracking-[0.5px] text-[#363636]"
                                >
                                    새 비밀번호
                                </Label>
                                <div className="relative">
                                    <Input
                                        id="new-password"
                                        {...register("newPassword", {
                                            onChange: () => setErrorMessage(""),
                                        })}
                                        type={showNewPassword ? "text" : "password"}
                                        autoComplete="new-password"
                                        placeholder="새 비밀번호를 입력해 주세요"
                                        aria-invalid={Boolean(errors.newPassword)}
                                        aria-describedby={
                                            errors.newPassword ? "new-password-error" : undefined
                                        }
                                        className="h-[45px] rounded-md border-[#dde5e9] bg-white pr-12 pl-5 text-base leading-[25px] font-normal text-[#363636] placeholder:text-[#6b7588] md:text-base dark:bg-white"
                                    />
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        aria-label={
                                            showNewPassword
                                                ? "새 비밀번호 숨기기"
                                                : "새 비밀번호 표시"
                                        }
                                        aria-pressed={showNewPassword}
                                        onClick={() => setShowNewPassword((value) => !value)}
                                        className="absolute top-[calc(50%-1rem)] right-2 text-[#6b6c7b]"
                                    >
                                        {showNewPassword ? (
                                            <Eye className="size-5" />
                                        ) : (
                                            <EyeOff className="size-5" />
                                        )}
                                    </Button>
                                </div>
                                {errors.newPassword ? (
                                    <p
                                        id="new-password-error"
                                        role="alert"
                                        className="mt-2 text-[13px] leading-5 text-[#fa503d]"
                                    >
                                        {errors.newPassword.message}
                                    </p>
                                ) : null}
                            </div>

                            <div>
                                <Label
                                    htmlFor="confirm-password"
                                    className="typography-body-medium mb-[5px] text-[length:var(--type-body-medium-size)] leading-[30px] font-semibold tracking-[0.5px] text-[#363636]"
                                >
                                    새 비밀번호 확인
                                </Label>
                                <div className="relative">
                                    <Input
                                        id="confirm-password"
                                        {...register("confirmPassword", {
                                            onChange: () => setErrorMessage(""),
                                        })}
                                        type={showConfirmPassword ? "text" : "password"}
                                        autoComplete="new-password"
                                        placeholder="비밀번호를 확인해 주세요"
                                        aria-invalid={Boolean(errors.confirmPassword)}
                                        aria-describedby={
                                            errors.confirmPassword
                                                ? "confirm-password-error"
                                                : undefined
                                        }
                                        className="h-[45px] rounded-md border-[#dde5e9] bg-white pr-12 pl-5 text-base leading-[25px] font-normal text-[#363636] placeholder:text-[#6b7588] md:text-base dark:bg-white"
                                    />
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        aria-label={
                                            showConfirmPassword
                                                ? "새 비밀번호 확인 숨기기"
                                                : "새 비밀번호 확인 표시"
                                        }
                                        aria-pressed={showConfirmPassword}
                                        onClick={() => setShowConfirmPassword((value) => !value)}
                                        className="absolute top-[calc(50%-1rem)] right-2 text-[#6b6c7b]"
                                    >
                                        {showConfirmPassword ? (
                                            <Eye className="size-5" />
                                        ) : (
                                            <EyeOff className="size-5" />
                                        )}
                                    </Button>
                                </div>
                                {errors.confirmPassword ? (
                                    <p
                                        id="confirm-password-error"
                                        role="alert"
                                        className="mt-2 text-[13px] leading-5 text-[#fa503d]"
                                    >
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
                            <p className="font-semibold tracking-[0.5px] text-[#6b6c7b]">
                                비밀번호 조건
                            </p>
                            <p className="text-[#6b7588]">• 영문과 숫자를 포함해 8~64자</p>
                            <p className="text-[#6b7588]">
                                • 재설정 링크는 한 번만 사용할 수 있습니다.
                            </p>
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
                                className="h-11 rounded-full border-[#dedee6] bg-white px-10 text-lg font-semibold text-[#6b7588] dark:border-[#dedee6] dark:bg-white"
                            >
                                <Link href="/login">취소</Link>
                            </Button>
                            <Button
                                type="submit"
                                disabled={isBusy}
                                className="h-11 rounded-full px-6 text-lg font-semibold sm:w-[160px] dark:bg-[#6653fb]"
                            >
                                {isBusy ? "재설정 중..." : "비밀번호 재설정"}
                            </Button>
                        </div>
                    </form>
                </section>
            </div>

            <AlertDialog
                open={Boolean(successMessage)}
                onOpenChange={(nextOpen) => {
                    if (!nextOpen) router.replace("/login");
                }}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>비밀번호 재설정 완료</AlertDialogTitle>
                        <AlertDialogDescription>{successMessage}</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogAction>로그인으로 이동</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </main>
    );
}
