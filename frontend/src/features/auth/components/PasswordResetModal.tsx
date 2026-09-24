"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Info } from "lucide-react";

import { Alert, AlertDescription } from "@/common/components/ui/Alert";
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
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogTitle,
    DialogTrigger,
} from "@/common/components/ui/Dialog";
import { Input } from "@/common/components/ui/Input";
import { Label } from "@/common/components/ui/Label";
import { getApiErrorMessage } from "@/common/lib/api/error";
import { usePasswordResetMutation } from "@/features/auth/hooks/mutations/usePasswordResetMutation";
import { passwordResetSchema } from "@/features/auth/schemas/authSchema";
import type { PasswordResetRequest } from "@/features/auth/types";

export function PasswordResetModal() {
    const [open, setOpen] = useState(false);
    const [successMessage, setSuccessMessage] = useState("");
    const [errorMessage, setErrorMessage] = useState("");
    const {
        register,
        handleSubmit,
        reset,
        formState: { errors, isSubmitting },
    } = useForm<PasswordResetRequest>({
        resolver: zodResolver(passwordResetSchema),
        defaultValues: { email: "" },
    });
    const { mutate: requestReset, isPending } = usePasswordResetMutation({
        onSuccess: setSuccessMessage,
        onError: (error) => setErrorMessage(getApiErrorMessage(error)),
    });
    const isBusy = isSubmitting || isPending;

    const onSubmit = (params: PasswordResetRequest) => {
        setSuccessMessage("");
        setErrorMessage("");
        requestReset(params);
    };

    return (
        <Dialog
            open={open}
            onOpenChange={(nextOpen) => {
                if (isBusy) return;
                setOpen(nextOpen);
                reset();
                setSuccessMessage("");
                setErrorMessage("");
            }}
        >
            <DialogTrigger asChild>
                <Button
                    type="button"
                    variant="link"
                    className="h-auto rounded-none p-0 text-base leading-[25px] font-semibold tracking-[0.5px] text-[#6b6c7b] underline underline-offset-2 hover:text-[#363636]"
                >
                    비밀번호 찾기
                </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[calc(100dvh-2rem)] max-w-[608px] gap-6 overflow-y-auto rounded-xl border-0 bg-white p-6 shadow-[0_10px_12px_rgba(0,0,0,0.1)] sm:top-[45%] sm:p-8 dark:bg-white">
                <div className="pr-10">
                    <DialogTitle className="typography-heading-03 text-[length:var(--type-heading-03-size)] leading-[42px] font-bold tracking-[0.5px] text-[#363636]">
                        비밀번호 찾기
                    </DialogTitle>
                    <DialogDescription className="mt-1.5 text-sm leading-[21px] font-semibold tracking-[0.07px] text-[#8f90a6]">
                        가입하신 이메일로 비밀번호 재설정 링크를 전송합니다.
                    </DialogDescription>
                </div>

                <div aria-hidden="true" className="h-px w-full bg-[#f2f2f5]" />

                <form id="password-reset-form" noValidate onSubmit={handleSubmit(onSubmit)}>
                    <Label
                        htmlFor="password-reset-email"
                        className="mb-0.5 text-base leading-[25px] font-semibold tracking-[0.5px] text-[#363636]"
                    >
                        가입 이메일 주소
                    </Label>
                    <Input
                        id="password-reset-email"
                        {...register("email", {
                            onChange: () => {
                                setSuccessMessage("");
                                setErrorMessage("");
                            },
                        })}
                        disabled={isBusy}
                        aria-invalid={Boolean(errors.email)}
                        type="email"
                        autoComplete="email"
                        placeholder="example@email.com"
                        aria-describedby={
                            errors.email ? "password-reset-error" : "password-reset-hint"
                        }
                        className="text-foreground h-12 rounded-xl px-4 text-base md:text-base"
                    />
                    {errors.email ? (
                        <p
                            id="password-reset-error"
                            role="alert"
                            className="text-destructive mt-2 text-[13px] leading-5"
                        >
                            {errors.email.message}
                        </p>
                    ) : null}
                    <p
                        id="password-reset-hint"
                        className="mt-2 flex items-center gap-2 text-[10px] leading-[15px] tracking-[0.05px] text-[#6b7588]"
                    >
                        <Info
                            aria-hidden="true"
                            className="relative -top-px size-[15px] shrink-0 text-[#8f90a6]"
                        />
                        입력하신 이메일로 재설정 링크가 전송됩니다.
                    </p>
                </form>

                <Alert className="flex items-center gap-3 rounded-md border-0 bg-[#f2f1fa] p-4 text-[#6653fb] *:[svg]:translate-y-0">
                    <Info aria-hidden="true" className="relative -top-px size-[18px] shrink-0" />
                    <AlertDescription className="text-[13px] leading-5 font-semibold tracking-[-0.5px] text-[#6b6c7b]">
                        스팸 메일함으로 발송될 수 있으니 메일이 도착하지 않으면 확인해 주세요.
                    </AlertDescription>
                </Alert>

                <AlertDialog
                    open={Boolean(successMessage)}
                    onOpenChange={(nextOpen) => {
                        if (!nextOpen) setSuccessMessage("");
                    }}
                >
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>재설정 메일 요청 완료</AlertDialogTitle>
                            <AlertDialogDescription>{successMessage}</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogAction>확인</AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
                {errorMessage ? (
                    <Alert variant="destructive" className="mt-4">
                        <AlertDescription>{errorMessage}</AlertDescription>
                    </Alert>
                ) : null}

                <div className="flex flex-col-reverse items-stretch justify-center gap-3 sm:flex-row sm:items-center">
                    <DialogClose asChild>
                        <Button
                            type="button"
                            variant="outline"
                            disabled={isBusy}
                            className="h-11 rounded-full border-[#dedee6] bg-white px-10 text-lg font-semibold text-[#6b7588] dark:border-[#dedee6] dark:bg-white"
                        >
                            취소
                        </Button>
                    </DialogClose>
                    <Button
                        type="submit"
                        form="password-reset-form"
                        disabled={isBusy}
                        className="bg-primary h-11 rounded-full px-6 text-lg font-semibold text-white sm:min-w-[220px] dark:bg-[#6653fb]"
                    >
                        {isBusy ? "전송 중..." : "재설정 링크 보내기"}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
