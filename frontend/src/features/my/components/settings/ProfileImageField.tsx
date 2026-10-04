"use client";

import { useRef } from "react";
import { Button } from "@/common/components/ui/Button";
import { ProfileAvatar } from "@/features/member/components/ProfileAvatar";

type ProfileImageFieldProps = {
    profileImageUrl?: string | null;
    isPreview: boolean;
    disabled: boolean;
    isUploading: boolean;
    onFileSelect: (file: File | undefined) => void;
    onPhotoRemove: () => void;
};

export function ProfileImageField({
    profileImageUrl,
    isPreview,
    disabled,
    isUploading,
    onFileSelect,
    onPhotoRemove,
}: ProfileImageFieldProps) {
    const fileInput = useRef<HTMLInputElement>(null);
    return (
        <div className="flex items-center gap-5 border-b pb-8">
            <ProfileAvatar
                src={profileImageUrl}
                alt={isPreview ? "프로필 사진 미리보기" : "프로필 사진"}
                size="settings"
            />
            <div className="space-y-1">
                <h2 className="font-semibold">프로필 사진</h2>
                <p className="text-muted-foreground text-[13px] leading-5">JPG, PNG · 최대 5MB</p>
                <input
                    ref={fileInput}
                    type="file"
                    accept="image/jpeg,image/png"
                    aria-label="프로필 사진 선택"
                    className="sr-only"
                    disabled={disabled}
                    onChange={(event) => {
                        const file = event.target.files?.[0];
                        event.target.value = "";
                        onFileSelect(file);
                    }}
                />
                <Button
                    type="button"
                    variant="outline"
                    disabled={disabled}
                    onClick={() => fileInput.current?.click()}
                    className="mt-2 h-auto rounded-full border-[#d3d3d3] px-[15px] py-[3px] text-[13px] leading-[20px] font-semibold tracking-[-0.5px] text-[#6b6c7b] hover:border-[#6653fb] hover:bg-[#fafbff] hover:text-[#6653fb] focus-visible:!border-[#6653fb] focus-visible:ring-3 focus-visible:!ring-[#6653fb]/30 dark:hover:bg-[#fafbff]"
                >
                    {isUploading ? "업로드 중..." : "사진 변경"}
                </Button>
                {profileImageUrl && (
                    <Button
                        type="button"
                        variant="outline"
                        disabled={disabled}
                        onClick={onPhotoRemove}
                        className="mt-2 ml-2 h-auto rounded-full border-[#d3d3d3] px-[15px] py-[3px] text-[13px] leading-[20px] font-semibold tracking-[-0.5px] text-[#6b6c7b] hover:border-[#6653fb] hover:bg-[#fafbff] hover:text-[#6653fb] focus-visible:!border-[#6653fb] focus-visible:ring-3 focus-visible:!ring-[#6653fb]/30 dark:hover:bg-[#fafbff]"
                    >
                        기본 이미지로 변경
                    </Button>
                )}
            </div>
        </div>
    );
}
