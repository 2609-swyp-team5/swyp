"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useForm } from "react-hook-form";
import { UserRound } from "lucide-react";

import { Button } from "@/common/components/ui/Button";
import { Input } from "@/common/components/ui/Input";
import { Label } from "@/common/components/ui/Label";
import { MyPageContent, MyPanel } from "@/features/my/components/MyPageContent";
import { MY_PREVIEW_PROFILE } from "@/features/my/myPreviewData";

export default function MySettingsPage() {
    const fileInput = useRef<HTMLInputElement>(null);
    const [photo, setPhoto] = useState("");
    const [photoError, setPhotoError] = useState("");
    const [saved, setSaved] = useState(false);
    const { register, handleSubmit } = useForm({ defaultValues: MY_PREVIEW_PROFILE });
    useEffect(
        () => () => {
            if (photo) URL.revokeObjectURL(photo);
        },
        [photo],
    );

    return (
        <MyPageContent eyebrow="계정 설정" title="사용자 정보 설정">
            <MyPanel className="w-full p-6 sm:p-8">
                <form
                    onSubmit={handleSubmit(() => setSaved(true))}
                    onChange={() => setSaved(false)}
                    className="space-y-7"
                >
                    <div className="flex items-center gap-5 border-b pb-8">
                        <div className="bg-primary/10 text-primary relative flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-full">
                            {photo ? (
                                <Image
                                    src={photo}
                                    alt="프로필 사진 미리보기"
                                    fill
                                    unoptimized
                                    className="object-cover"
                                />
                            ) : (
                                <UserRound className="size-7" aria-hidden="true" />
                            )}
                        </div>
                        <div className="space-y-1">
                            <h2 className="font-semibold">프로필 사진</h2>
                            <p className="text-muted-foreground text-[13px] leading-5">
                                JPG, PNG · 최대 5MB
                            </p>
                            <input
                                ref={fileInput}
                                type="file"
                                accept="image/jpeg,image/png"
                                aria-label="프로필 사진 선택"
                                className="sr-only"
                                onChange={(event) => {
                                    const file = event.target.files?.[0];
                                    if (!file) return;
                                    if (
                                        !["image/jpeg", "image/png"].includes(file.type) ||
                                        file.size > 5 * 1024 * 1024
                                    ) {
                                        setPhotoError(
                                            "5MB 이하의 JPG 또는 PNG 파일을 선택해 주세요.",
                                        );
                                        event.target.value = "";
                                        return;
                                    }
                                    setPhotoError("");
                                    setSaved(false);
                                    setPhoto(URL.createObjectURL(file));
                                    event.target.value = "";
                                }}
                            />
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => fileInput.current?.click()}
                                className="text-primary mt-2 h-9 px-4 text-[13px]"
                            >
                                사진 변경
                            </Button>
                        </div>
                    </div>
                    {photoError ? (
                        <p role="alert" className="text-destructive text-[13px]">
                            {photoError}
                        </p>
                    ) : null}
                    <div className="space-y-2">
                        <Label htmlFor="profile-name" className="text-[13px] font-semibold">
                            이름 (닉네임)
                        </Label>
                        <Input
                            id="profile-name"
                            {...register("name")}
                            required
                            className="h-12 rounded-xl px-4 text-base md:text-base"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="profile-email" className="text-[13px] font-semibold">
                            이메일
                        </Label>
                        <Input
                            id="profile-email"
                            {...register("email")}
                            readOnly
                            aria-describedby="email-hint"
                            className="bg-muted text-muted-foreground h-12 rounded-xl px-4 text-base md:text-base"
                        />
                        <p id="email-hint" className="text-muted-foreground text-[13px] leading-5">
                            이메일은 변경할 수 없습니다.
                        </p>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="profile-phone" className="text-[13px] font-semibold">
                            휴대폰 번호
                        </Label>
                        <Input
                            id="profile-phone"
                            {...register("phone")}
                            type="tel"
                            autoComplete="tel"
                            placeholder="010-1234-5678"
                            className="h-12 rounded-xl px-4 text-base md:text-base"
                        />
                    </div>
                    <Button
                        type="submit"
                        className="h-[50px] w-full rounded-xl text-base font-semibold"
                    >
                        변경 사항 저장
                    </Button>
                    {saved ? (
                        <p role="status" className="text-primary text-center text-[13px]">
                            변경 사항이 적용되었습니다.
                        </p>
                    ) : null}
                </form>
            </MyPanel>
        </MyPageContent>
    );
}
