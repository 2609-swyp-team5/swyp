"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Info } from "lucide-react";

import { Alert, AlertDescription } from "@/common/components/ui/Alert";
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
import { AuthResultDialog } from "@/features/auth/components/shared/AuthResultDialog";
import { usePasswordResetMutation } from "@/features/auth/hooks/mutations/usePasswordResetMutation";
import { passwordResetSchema } from "@/features/auth/schemas/authSchema";
import type { PasswordResetRequest } from "@/features/auth/types";

const buttonFocusClassName =
    "focus-visible:!border-[#6653fb] focus-visible:ring-3 focus-visible:!ring-[#6653fb]/30";

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
                    className={`${buttonFocusClassName} typography-body-bold h-auto rounded-none p-0 font-semibold text-[#6b6c7b] underline underline-offset-2 hover:text-[#6653fb]`}
                >
                    비밀번호 찾기
                </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[calc(100dvh-2rem)] max-w-[608px] gap-6 overflow-y-auto rounded-xl border-0 bg-white p-6 shadow-[0_10px_12px_rgba(0,0,0,0.1)] sm:top-[45%] sm:p-8 dark:bg-white">
                <div className="pr-10">
                    <DialogTitle className="typography-heading-03 font-bold text-[#363636]">
                        비밀번호 찾기
                    </DialogTitle>
                    <DialogDescription className="typography-body-bold-small mt-1.5 font-semibold text-[#8f90a6]">
                        가입하신 이메일로 비밀번호 재설정 링크를 전송합니다.
                    </DialogDescription>
                </div>

                <div aria-hidden="true" className="h-px w-full bg-[#f2f2f5]" />

                <form id="password-reset-form" noValidate onSubmit={handleSubmit(onSubmit)}>
                    <Label
                        htmlFor="password-reset-email"
                        className="typography-body-bold mb-0.5 font-semibold text-[#363636]"
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
                        className="text-foreground aria-invalid:focus-visible:border-destructive typography-body-medium h-12 rounded-xl px-4 focus-visible:border-[#6653fb] focus-visible:ring-0"
                    />
                    {errors.email ? (
                        <p
                            id="password-reset-error"
                            role="alert"
                            className="text-destructive typography-body-small mt-2"
                        >
                            {errors.email.message}
                        </p>
                    ) : null}
                    <p
                        id="password-reset-hint"
                        className="typography-caption mt-2 flex items-center gap-2 text-[#6b7588]"
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
                    <AlertDescription className="typography-body-bold-small font-semibold text-[#6b6c7b]">
                        스팸 메일함으로 발송될 수 있으니 메일이 도착하지 않으면 확인해 주세요.
                    </AlertDescription>
                </Alert>

                <AuthResultDialog
                    open={Boolean(successMessage)}
                    onOpenChange={(nextOpen) => {
                        if (!nextOpen) setSuccessMessage("");
                    }}
                    title="재설정 메일 요청 완료"
                    message={successMessage}
                />
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
                            className={`typography-body-large h-11 rounded-full border-[#dedee6] bg-white px-10 font-semibold text-[#6b7588] dark:border-[#dedee6] dark:bg-white ${buttonFocusClassName} hover:bg-[#c6c6c6] hover:text-white dark:hover:bg-[#c6c6c6] dark:hover:text-white`}
                        >
                            취소
                        </Button>
                    </DialogClose>
                    <Button
                        type="submit"
                        form="password-reset-form"
                        disabled={isBusy}
                        className={`bg-primary typography-body-large h-11 rounded-full px-6 font-semibold text-white sm:min-w-[220px] dark:bg-[#6653fb] ${buttonFocusClassName} hover:bg-[#5745e7] dark:hover:bg-[#5745e7]`}
                    >
                        {isBusy ? "전송 중..." : "재설정 링크 보내기"}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
