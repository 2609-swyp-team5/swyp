"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CircleHelp, CircleX, Info } from "lucide-react";

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
                    className="text-muted-foreground hover:text-foreground mt-2 h-auto rounded-none p-0 text-base font-medium underline underline-offset-2"
                >
                    비밀번호 찾기
                </Button>
            </DialogTrigger>
            <DialogContent className="top-[8dvh] max-h-[84dvh] max-w-[640px] translate-y-0 gap-0 overflow-y-auto p-6 sm:p-8">
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <DialogTitle className="text-2xl leading-normal font-bold">
                            비밀번호 찾기
                        </DialogTitle>
                        <DialogDescription className="mt-2">
                            가입하신 이메일로 비밀번호 재설정 링크를 전송합니다.
                        </DialogDescription>
                    </div>
                    <DialogClose asChild>
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            aria-label="비밀번호 찾기 닫기"
                            disabled={isBusy}
                            className="text-muted-foreground shrink-0"
                        >
                            <CircleX aria-hidden="true" className="size-5" />
                        </Button>
                    </DialogClose>
                </div>

                <form
                    id="password-reset-form"
                    noValidate
                    onSubmit={handleSubmit(onSubmit)}
                    className="mt-10"
                >
                    <Label htmlFor="password-reset-email" className="mb-2 text-base font-semibold">
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
                        className="h-14 rounded-md px-5 text-sm"
                    />
                    {errors.email ? (
                        <p
                            id="password-reset-error"
                            role="alert"
                            className="text-destructive mt-1 text-sm"
                        >
                            {errors.email.message}
                        </p>
                    ) : null}
                    <p
                        id="password-reset-hint"
                        className="text-muted-foreground mt-2 flex items-start gap-2 text-xs leading-5"
                    >
                        <CircleHelp aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" />
                        입력하신 이메일로 재설정 링크가 전송됩니다.
                    </p>
                </form>

                <Alert className="bg-primary/5 mt-6 border-0 px-4 py-4">
                    <Info aria-hidden="true" className="text-primary size-4" />
                    <AlertDescription className="text-foreground leading-5">
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

                <div className="mt-6 flex justify-center gap-4">
                    <DialogClose asChild>
                        <Button
                            type="button"
                            variant="outline"
                            disabled={isBusy}
                            className="text-muted-foreground h-11 rounded-md px-6"
                        >
                            취소
                        </Button>
                    </DialogClose>
                    <Button
                        type="submit"
                        form="password-reset-form"
                        disabled={isBusy}
                        className="h-11 rounded-md px-6 font-semibold"
                    >
                        {isBusy ? "전송 중..." : "재설정 링크 보내기"}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
