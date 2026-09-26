"use client";

import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { Button } from "@/common/components/ui/Button";
import { Input } from "@/common/components/ui/Input";
import { Label } from "@/common/components/ui/Label";
import {
    AlertDialog,
    AlertDialogContent,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogAction,
} from "@/common/components/ui/AlertDialog";
import { MyPageContent, MyPanel } from "@/features/my/components/MyPageContent";
import { getApiErrorMessage } from "@/common/lib/api/error";
import { useMeQuery } from "@/features/member/hooks/queries/useMeQuery";
import { useUpdateMemberMutation } from "@/features/member/hooks/mutations/useUpdateMemberMutation";
import { memberUpdateSchema } from "@/features/member/schemas/memberSchema";
import { useUpdateProfileImageMutation } from "@/features/member/hooks/mutations/useUpdateProfileImageMutation";
import { ProfileAvatar } from "@/features/member/components/ProfileAvatar";

export default function MySettingsPage() {
    const fileInput = useRef<HTMLInputElement>(null);
    const [photo, setPhoto] = useState("");
    const [notice, setNotice] = useState<{ title: string; message: string } | null>(null);
    const [photoFile, setPhotoFile] = useState<File | null>(null);
    const [dismissedQueryError, setDismissedQueryError] = useState(0);
    const {
        data: member,
        isError,
        error: queryError,
        errorUpdatedAt,
        isFetching,
        refetch,
    } = useMeQuery();
    const { mutate: updateMember, isPending } = useUpdateMemberMutation();
    const queryErrorOpen = isError && errorUpdatedAt !== dismissedQueryError;
    const dialog =
        notice ??
        (queryErrorOpen
            ? { title: "회원정보 조회 실패", message: getApiErrorMessage(queryError) }
            : null);
    const { mutate: updateImage, isPending: isUploading } = useUpdateProfileImageMutation();
    const isBusy = isPending || isUploading;
    const profileImageUrl = photo || member?.profileImageUrl;
    const {
        register,
        handleSubmit,
        reset,
        formState: { errors },
    } = useForm({
        resolver: zodResolver(memberUpdateSchema),
        defaultValues: { nickname: "", phone: "" },
        values: { nickname: member?.nickname ?? "", phone: member?.phone ?? "" },
        resetOptions: { keepDirtyValues: true },
    });
    useEffect(
        () => () => {
            if (photo) URL.revokeObjectURL(photo);
        },
        [photo],
    );

    return (
        <MyPageContent eyebrow="계정 설정" title="사용자 정보 설정">
            <MyPanel className="w-full p-6 sm:p-8">
                {isError ? (
                    <div className="mb-6 flex items-center gap-3">
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={isFetching}
                            onClick={() => void refetch()}
                        >
                            다시 시도
                        </Button>
                    </div>
                ) : !member ? (
                    <p role="status" className="text-muted-foreground mb-6 text-[13px]">
                        회원정보를 불러오는 중입니다.
                    </p>
                ) : null}
                <form
                    noValidate
                    onSubmit={handleSubmit((values) => {
                        if (!member || isBusy) return;
                        setNotice(null);
                        updateMember(
                            {
                                nickname: values.nickname,
                                phone: values.phone.replace(/-/g, "") || null,
                            },
                            {
                                onSuccess: (updated) => {
                                    reset({
                                        nickname: updated.nickname,
                                        phone: updated.phone ?? "",
                                    });
                                    if (photoFile) {
                                        updateImage(photoFile, {
                                            onSuccess: () => {
                                                setPhoto("");
                                                setPhotoFile(null);
                                                setNotice({
                                                    title: "저장 완료",
                                                    message: "변경 사항이 적용되었습니다.",
                                                });
                                            },
                                            onError: (uploadError) => {
                                                setNotice({
                                                    title: "사진 저장 실패",
                                                    message: `회원정보는 저장되었지만 사진은 저장하지 못했습니다. ${getApiErrorMessage(uploadError)}`,
                                                });
                                            },
                                        });
                                    } else {
                                        setNotice({
                                            title: "저장 완료",
                                            message: "변경 사항이 적용되었습니다.",
                                        });
                                    }
                                },
                                onError: (saveError) =>
                                    setNotice({
                                        title: "저장 실패",
                                        message: getApiErrorMessage(saveError),
                                    }),
                            },
                        );
                    })}
                    className="space-y-7"
                >
                    <div className="flex items-center gap-5 border-b pb-8">
                        <ProfileAvatar
                            src={profileImageUrl}
                            alt={photo ? "프로필 사진 미리보기" : "프로필 사진"}
                            size="settings"
                        />
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
                                disabled={!member || isBusy}
                                onChange={(event) => {
                                    const file = event.target.files?.[0];
                                    event.target.value = "";
                                    if (!file || !member || isBusy) return;
                                    if (
                                        !["image/jpeg", "image/png"].includes(file.type) ||
                                        file.size > 5 * 1024 * 1024
                                    ) {
                                        setNotice({
                                            title: "사진 선택 오류",
                                            message:
                                                "5MB 이하의 JPG 또는 PNG 파일을 선택해 주세요.",
                                        });
                                        return;
                                    }
                                    setPhoto(URL.createObjectURL(file));
                                    setPhotoFile(file);
                                }}
                            />
                            <Button
                                type="button"
                                variant="outline"
                                disabled={!member || isBusy}
                                onClick={() => fileInput.current?.click()}
                                className="text-primary mt-2 h-9 px-4 text-[13px]"
                            >
                                {isUploading ? "업로드 중..." : "사진 변경"}
                            </Button>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="profile-name" className="text-[13px] font-semibold">
                            이름 (닉네임)
                        </Label>
                        <Input
                            id="profile-name"
                            {...register("nickname")}
                            required
                            disabled={!member || isBusy}
                            aria-invalid={Boolean(errors.nickname)}
                            aria-describedby={errors.nickname ? "nickname-error" : undefined}
                            className="h-12 rounded-xl px-4 text-base md:text-base"
                        />
                        {errors.nickname ? (
                            <p
                                id="nickname-error"
                                role="alert"
                                className="text-destructive text-[13px]"
                            >
                                {errors.nickname.message}
                            </p>
                        ) : null}
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="profile-email" className="text-[13px] font-semibold">
                            이메일
                        </Label>
                        <Input
                            id="profile-email"
                            value={member?.email ?? ""}
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
                            disabled={!member || isBusy}
                            aria-invalid={Boolean(errors.phone)}
                            aria-describedby={errors.phone ? "phone-error" : undefined}
                            type="tel"
                            autoComplete="tel"
                            placeholder="010-1234-5678"
                            className="h-12 rounded-xl px-4 text-base md:text-base"
                        />
                        {errors.phone ? (
                            <p
                                id="phone-error"
                                role="alert"
                                className="text-destructive text-[13px]"
                            >
                                {errors.phone.message}
                            </p>
                        ) : null}
                    </div>
                    <Button
                        type="submit"
                        disabled={!member || isBusy}
                        className="h-[50px] w-full rounded-xl text-base font-semibold"
                    >
                        {isBusy ? "저장 중..." : "변경 사항 저장"}
                    </Button>
                </form>
            </MyPanel>
            <AlertDialog
                open={Boolean(dialog)}
                onOpenChange={(open) => {
                    if (!open) {
                        setNotice(null);
                        setDismissedQueryError(errorUpdatedAt);
                    }
                }}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{dialog?.title}</AlertDialogTitle>
                        <AlertDialogDescription>{dialog?.message}</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogAction>확인</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </MyPageContent>
    );
}
