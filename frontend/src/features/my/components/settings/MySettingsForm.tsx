"use client";

import type { SubmitHandler, UseFormReturn } from "react-hook-form";
import { Button } from "@/common/components/ui/Button";
import { Input } from "@/common/components/ui/Input";
import { Label } from "@/common/components/ui/Label";
import type { MemberResponse } from "@/features/member/types";
import { ProfileImageField } from "@/features/my/components/settings/ProfileImageField";

const fieldErrorClassName = "text-destructive text-[13px]";

const labelClassName = "text-[13px] font-semibold";

const fieldClassName =
    "h-12 rounded-xl px-4 text-base md:text-base focus-visible:border-[#6653fb] focus-visible:ring-0 aria-invalid:focus-visible:border-destructive";

export type MySettingsFormValues = { nickname: string; phone: string };
type MySettingsFormProps = {
    form: UseFormReturn<MySettingsFormValues>;
    member?: MemberResponse;
    isBusy: boolean;
    isUploading: boolean;
    profileImageUrl?: string | null;
    isPreview: boolean;
    onSubmit: SubmitHandler<MySettingsFormValues>;
    onFileSelect: (file: File | undefined) => void;
    onPhotoRemove: () => void;
};

export function MySettingsForm({
    form,
    member,
    isBusy,
    isUploading,
    profileImageUrl,
    isPreview,
    onSubmit,
    onFileSelect,
    onPhotoRemove,
}: MySettingsFormProps) {
    const {
        register,
        handleSubmit,
        formState: { errors },
    } = form;
    return (
        <form noValidate onSubmit={handleSubmit(onSubmit)} className="space-y-7">
            <ProfileImageField
                profileImageUrl={profileImageUrl}
                isPreview={isPreview}
                disabled={!member || isBusy}
                isUploading={isUploading}
                onFileSelect={onFileSelect}
                onPhotoRemove={onPhotoRemove}
            />
            <div className="space-y-2">
                <Label htmlFor="profile-name" className={labelClassName}>
                    이름 (닉네임)
                </Label>
                <Input
                    id="profile-name"
                    {...register("nickname")}
                    required
                    disabled={!member || isBusy}
                    aria-invalid={Boolean(errors.nickname)}
                    aria-describedby={errors.nickname ? "nickname-error" : undefined}
                    className={fieldClassName}
                />
                {errors.nickname ? (
                    <p id="nickname-error" role="alert" className={fieldErrorClassName}>
                        {errors.nickname.message}
                    </p>
                ) : null}
            </div>
            <div className="space-y-2">
                <Label htmlFor="profile-email" className={labelClassName}>
                    이메일
                </Label>
                <Input
                    id="profile-email"
                    value={member?.email ?? ""}
                    readOnly
                    aria-describedby="email-hint"
                    className={`bg-muted text-muted-foreground ${fieldClassName}`}
                />
                <p
                    id="email-hint"
                    className="text-[14px] leading-[15px] tracking-[-0.5px] text-[#fa503d]"
                >
                    이메일은 변경할 수 없습니다.
                </p>
            </div>
            <div className="space-y-2">
                <Label htmlFor="profile-phone" className={labelClassName}>
                    휴대폰 번호
                </Label>
                <Input
                    id="profile-phone"
                    {...register("phone")}
                    disabled={!member || isBusy}
                    aria-invalid={Boolean(errors.phone)}
                    aria-describedby={errors.phone ? "phone-error" : undefined}
                    type="tel"
                    autoComplete="tel"
                    placeholder="010-1234-5678"
                    className={fieldClassName}
                />
                {errors.phone ? (
                    <p id="phone-error" role="alert" className={fieldErrorClassName}>
                        {errors.phone.message}
                    </p>
                ) : null}
            </div>
            <Button
                type="submit"
                disabled={!member || isBusy}
                className="h-[50px] w-full rounded-xl text-base font-semibold hover:bg-[#5745e7] focus-visible:!border-[#6653fb] focus-visible:ring-3 focus-visible:!ring-[#6653fb]/30 dark:hover:bg-[#5745e7]"
            >
                {isBusy ? "저장 중..." : "변경 사항 저장"}
            </Button>
        </form>
    );
}
