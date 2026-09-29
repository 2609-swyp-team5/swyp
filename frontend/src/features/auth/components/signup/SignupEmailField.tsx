"use client";

import type { FieldError, UseFormRegisterReturn } from "react-hook-form";

import { Button } from "@/common/components/ui/Button";
import { Input } from "@/common/components/ui/Input";
import { Label } from "@/common/components/ui/Label";

type SignupEmailFieldProps = {
    registration: UseFormRegisterReturn<"email">;
    error?: FieldError;
    checkedEmail: string | null;
    isCheckingEmail: boolean;
    onCheckEmail: () => void;
};

export function SignupEmailField({
    registration,
    error,
    checkedEmail,
    isCheckingEmail,
    onCheckEmail,
}: SignupEmailFieldProps) {
    return (
        <div>
            <Label
                className="typography-body-medium mb-2 text-[length:var(--type-body-medium-size)] leading-[30px] font-semibold text-[#363636]"
                htmlFor="email"
            >
                이메일 주소
            </Label>
            <div className="flex gap-2">
                <Input
                    id="email"
                    {...registration}
                    aria-invalid={Boolean(error)}
                    aria-describedby={
                        error ? "email-error" : checkedEmail ? "email-check-status" : undefined
                    }
                    type="email"
                    autoComplete="email"
                    placeholder="example@email.com"
                    className="text-foreground aria-invalid:focus-visible:border-destructive h-12 rounded-xl px-4 text-base focus-visible:border-[#6653fb] focus-visible:ring-0 md:text-base"
                />
                <Button
                    type="button"
                    variant="outline"
                    onClick={onCheckEmail}
                    className="h-12 shrink-0 hover:border-[#6653fb] hover:bg-[#fafbff] hover:text-[#6653fb] focus-visible:!border-[#6653fb] focus-visible:ring-3 focus-visible:!ring-[#6653fb]/30 dark:hover:bg-[#fafbff]"
                >
                    {isCheckingEmail ? "확인 중..." : "중복 확인"}
                </Button>
            </div>
            {error ? (
                <p
                    id="email-error"
                    role="alert"
                    className="mt-2 text-[13px] leading-5 text-[#fa503d]"
                >
                    {error.message}
                </p>
            ) : checkedEmail ? (
                <p
                    id="email-check-status"
                    role="status"
                    className="mt-2 text-[13px] leading-5 text-green-600"
                >
                    사용 가능한 이메일입니다.
                </p>
            ) : null}
        </div>
    );
}
