"use client";

import { useState } from "react";

import { Button } from "@/common/components/ui/Button";
import { Checkbox } from "@/common/components/ui/Checkbox";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogTitle,
} from "@/common/components/ui/Dialog";
import { Input } from "@/common/components/ui/Input";
import { Label } from "@/common/components/ui/Label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/common/components/ui/Select";
import type {
    BunjangCarrier,
    BunjangVerificationRequest,
    BunjangVerificationResponse,
} from "@/features/my/types";

import type { PlatformConnection } from "./PlatformCard";
import { BunjangOtpStep } from "./BunjangOtpStep";

const buttonFocusClassName =
    "focus-visible:!border-[#6653fb] focus-visible:ring-3 focus-visible:!ring-[#6653fb]/30";
const fieldClassName =
    "h-[50px] rounded-[8px] border border-[#d3d3d3] bg-[#fafbff] px-4 py-3 typography-body-medium text-[#6b6c7b] shadow-none placeholder:text-[#d3d3d3] focus-visible:border-[#6653fb] focus-visible:ring-0";
const selectClassName =
    "h-[50px] w-full rounded-[8px] border border-[#d3d3d3] bg-[#fafbff] px-4 typography-body-medium text-[#6b6c7b] shadow-none data-placeholder:text-[#d3d3d3] focus-visible:border-[#6653fb] focus-visible:ring-0";
const fieldLabelClassName = "typography-body-bold font-semibold text-[#464646]";

const carriers: { value: BunjangCarrier; label: string }[] = [
    { value: "SKT", label: "SKT" },
    { value: "KT", label: "KT" },
    { value: "LG_U_PLUS", label: "LG U+" },
    { value: "SKT_MVNO", label: "SKT 알뜰폰" },
    { value: "KT_MVNO", label: "KT 알뜰폰" },
    { value: "LG_U_PLUS_MVNO", label: "LG U+ 알뜰폰" },
];

type VerificationForm = Omit<BunjangVerificationRequest, "carrier"> & {
    carrier: BunjangCarrier | "";
};

type VerificationFormErrors = Partial<Record<keyof VerificationForm, string>>;

const initialForm: VerificationForm = {
    name: "",
    birthDate: "",
    genderDigit: "",
    carrier: "",
    phone: "",
    agreedToBunjangTerms: false,
};

type BunjangVerificationDialogProps = {
    selected: PlatformConnection | null;
    verification: BunjangVerificationResponse | null;
    verificationVersion: number;
    isRequestPending: boolean;
    isConfirmPending: boolean;
    errorMessage: string | null;
    onOpenChange: (open: boolean) => void;
    onRequest: (request: BunjangVerificationRequest) => void;
    onConfirm: (otp: string, verificationId: string) => void;
};

export function BunjangVerificationDialog({
    selected,
    verification,
    verificationVersion,
    isRequestPending,
    isConfirmPending,
    errorMessage,
    onOpenChange,
    onRequest,
    onConfirm,
}: BunjangVerificationDialogProps) {
    const [form, setForm] = useState<VerificationForm>(initialForm);
    const [errors, setErrors] = useState<VerificationFormErrors>({});
    const isPending = isRequestPending || isConfirmPending;
    const isOtpStep = verification !== null;
    const platformName = selected?.name ?? "플랫폼";

    const updateField = <K extends keyof VerificationForm>(
        field: K,
        value: VerificationForm[K],
    ) => {
        setForm((current) => ({ ...current, [field]: value }));
        setErrors((current) => ({ ...current, [field]: undefined }));
    };

    const validateForm = () => {
        const nextErrors: VerificationFormErrors = {};
        if (!form.name.trim()) nextErrors.name = "이름을 입력해 주세요.";
        if (!/^\d{6}$/.test(form.birthDate)) {
            nextErrors.birthDate = "생년월일 6자리를 입력해 주세요. (예: 900101)";
        }
        if (!/^\d$/.test(form.genderDigit)) {
            nextErrors.genderDigit = "주민등록번호 뒷자리 첫 숫자를 입력해 주세요.";
        }
        if (!form.carrier) nextErrors.carrier = "통신사를 선택해 주세요.";
        if (!/^01[016789]\d{7,8}$/.test(form.phone)) {
            nextErrors.phone = "휴대폰 번호를 숫자만 입력해 주세요.";
        }
        if (!form.agreedToBunjangTerms) {
            nextErrors.agreedToBunjangTerms = `${platformName} 필수 약관에 동의해 주세요.`;
        }
        setErrors(nextErrors);
        return Object.keys(nextErrors).length === 0;
    };

    const requestVerification = () => {
        if (!validateForm() || !form.carrier) return;
        onRequest({ ...form, carrier: form.carrier });
    };

    return (
        <Dialog open={selected !== null} onOpenChange={onOpenChange}>
            <DialogContent className="max-h-[calc(100vh-2rem)] overflow-y-auto sm:max-w-[600px]">
                <DialogTitle>{selected?.name} 본인인증</DialogTitle>
                <DialogDescription>
                    {isOtpStep
                        ? `${platformName}에서 받은 인증번호를 입력해 주세요.`
                        : `${platformName} 연결을 위해 본인인증을 진행해 주세요.`}
                </DialogDescription>

                {errorMessage && (
                    <p role="alert" className="text-destructive typography-body-small">
                        {errorMessage}
                    </p>
                )}

                {verification ? (
                    <BunjangOtpStep
                        key={`${verification.verificationId}:${verificationVersion}`}
                        verification={verification}
                        isRequestPending={isRequestPending}
                        isConfirmPending={isConfirmPending}
                        onCancel={() => onOpenChange(false)}
                        onRequest={requestVerification}
                        onConfirm={onConfirm}
                    />
                ) : (
                    <form
                        onSubmit={(event) => {
                            event.preventDefault();
                            if (!isPending) requestVerification();
                        }}
                        className="space-y-4"
                    >
                        <div className="grid grid-cols-2 gap-3">
                            <Field
                                id="bunjang-name"
                                label="이름"
                                value={form.name}
                                error={errors.name}
                                disabled={isPending}
                                onChange={(value) => updateField("name", value)}
                                placeholder="홍길동"
                            />
                            <Field
                                id="bunjang-birth-date"
                                label="생년월일"
                                value={form.birthDate}
                                error={errors.birthDate}
                                disabled={isPending}
                                inputMode="numeric"
                                maxLength={6}
                                placeholder="YYMMDD"
                                onChange={(value) =>
                                    updateField("birthDate", value.replace(/\D/g, ""))
                                }
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <Field
                                id="bunjang-gender-digit"
                                label="주민등록번호 뒷자리 첫 숫자"
                                value={form.genderDigit}
                                error={errors.genderDigit}
                                disabled={isPending}
                                inputMode="numeric"
                                maxLength={1}
                                placeholder="1"
                                onChange={(value) =>
                                    updateField("genderDigit", value.replace(/\D/g, "").slice(0, 1))
                                }
                            />
                            <div className="flex flex-col gap-1.5">
                                <Label htmlFor="bunjang-carrier" className={fieldLabelClassName}>
                                    통신사
                                </Label>
                                <Select
                                    value={form.carrier}
                                    onValueChange={(value) =>
                                        updateField("carrier", value as BunjangCarrier)
                                    }
                                    disabled={isPending}
                                >
                                    <SelectTrigger
                                        id="bunjang-carrier"
                                        aria-label="통신사"
                                        aria-invalid={Boolean(errors.carrier)}
                                        className={selectClassName}
                                    >
                                        <SelectValue placeholder="통신사 선택" />
                                    </SelectTrigger>
                                    <SelectContent
                                        position="popper"
                                        className="!w-[var(--radix-select-trigger-width)] !bg-white !text-[#6b6c7b]"
                                    >
                                        {carriers.map((carrier) => (
                                            <SelectItem key={carrier.value} value={carrier.value}>
                                                {carrier.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {errors.carrier && (
                                    <p
                                        role="alert"
                                        className="text-destructive typography-body-small"
                                    >
                                        {errors.carrier}
                                    </p>
                                )}
                            </div>
                        </div>
                        <Field
                            id="bunjang-phone"
                            label="휴대폰 번호"
                            value={form.phone}
                            error={errors.phone}
                            disabled={isPending}
                            inputMode="numeric"
                            maxLength={11}
                            placeholder="01012345678"
                            onChange={(value) => updateField("phone", value.replace(/\D/g, ""))}
                        />
                        <div className="flex items-start gap-2">
                            <Checkbox
                                id="bunjang-terms"
                                checked={form.agreedToBunjangTerms}
                                disabled={isPending}
                                aria-invalid={Boolean(errors.agreedToBunjangTerms)}
                                onCheckedChange={(checked) =>
                                    updateField("agreedToBunjangTerms", checked === true)
                                }
                                className="mt-1 size-[13px] rounded-[2px] border-[#d3d3d3] data-[state=checked]:border-[#5d55fe] data-[state=checked]:bg-[#5d55fe] [&_svg]:size-[11px]"
                            />
                            <div>
                                <Label
                                    htmlFor="bunjang-terms"
                                    className="typography-body-medium cursor-pointer text-[#545d82]"
                                >
                                    {platformName} 본인인증 필수 약관에 동의합니다.
                                </Label>
                                {errors.agreedToBunjangTerms && (
                                    <p
                                        role="alert"
                                        className="text-destructive typography-body-small mt-1"
                                    >
                                        {errors.agreedToBunjangTerms}
                                    </p>
                                )}
                            </div>
                        </div>
                        <div className="flex justify-end gap-2 pt-2">
                            <Button
                                type="button"
                                variant="outline"
                                disabled={isPending}
                                onClick={() => onOpenChange(false)}
                                className={buttonFocusClassName}
                            >
                                취소
                            </Button>
                            <Button
                                type="submit"
                                disabled={isPending}
                                className={buttonFocusClassName}
                            >
                                {isRequestPending ? "문자 요청 중..." : "인증 문자 받기"}
                            </Button>
                        </div>
                    </form>
                )}
            </DialogContent>
        </Dialog>
    );
}

type FieldProps = {
    id: string;
    label: string;
    value: string;
    error?: string;
    disabled: boolean;
    inputMode?: "numeric" | "text";
    maxLength?: number;
    placeholder?: string;
    onChange: (value: string) => void;
};

function Field({
    id,
    label,
    value,
    error,
    disabled,
    inputMode = "text",
    maxLength,
    placeholder,
    onChange,
}: FieldProps) {
    return (
        <div className="flex flex-col gap-1.5">
            <Label htmlFor={id} className={fieldLabelClassName}>
                {label}
            </Label>
            <Input
                id={id}
                value={value}
                disabled={disabled}
                inputMode={inputMode}
                maxLength={maxLength}
                placeholder={placeholder}
                aria-invalid={Boolean(error)}
                onChange={(event) => onChange(event.target.value)}
                className={fieldClassName}
            />
            {error && (
                <p role="alert" className="text-destructive typography-body-small">
                    {error}
                </p>
            )}
        </div>
    );
}
