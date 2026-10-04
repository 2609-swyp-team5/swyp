"use client";

import { useEffect, useState } from "react";
import { useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { Button } from "@/common/components/ui/Button";
import { MyPageContent, MyPanel } from "@/features/my/components/MyPageContent";
import { getApiErrorMessage } from "@/common/lib/api/error";
import { useMeQuery } from "@/features/member/hooks/queries/useMeQuery";
import { useUpdateMemberMutation } from "@/features/member/hooks/mutations/useUpdateMemberMutation";
import { memberUpdateSchema } from "@/features/member/schemas/memberSchema";
import { useUpdateProfileImageMutation } from "@/features/member/hooks/mutations/useUpdateProfileImageMutation";
import { useDeleteProfileImageMutation } from "@/features/member/hooks/mutations/useDeleteProfileImageMutation";

import {
    MySettingsForm,
    type MySettingsFormValues,
} from "@/features/my/components/settings/MySettingsForm";
import { MyResultDialog } from "@/features/my/components/shared/MyResultDialog";

export function MySettingsPage() {
    const [photo, setPhoto] = useState("");
    const [notice, setNotice] = useState<{ title: string; message: string } | null>(null);
    const [photoFile, setPhotoFile] = useState<File | null>(null);
    const [isPhotoRemoved, setIsPhotoRemoved] = useState(false);
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
    const { mutate: deleteImage, isPending: isDeleting } = useDeleteProfileImageMutation();
    const isBusy = isPending || isUploading || isDeleting;
    const profileImageUrl = isPhotoRemoved ? null : photo || member?.profileImageUrl;
    const form = useForm<MySettingsFormValues>({
        resolver: zodResolver(memberUpdateSchema),
        defaultValues: { nickname: "", phone: "" },
        values: { nickname: member?.nickname ?? "", phone: member?.phone ?? "" },
        resetOptions: { keepDirtyValues: true },
    });
    const { reset } = form;

    useEffect(
        () => () => {
            if (photo) URL.revokeObjectURL(photo);
        },
        [photo],
    );

    const onSubmit: SubmitHandler<MySettingsFormValues> = (values) => {
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
                    if (photoFile || isPhotoRemoved) {
                        const photoOptions = {
                            onSuccess: () => {
                                setPhoto("");
                                setPhotoFile(null);
                                setIsPhotoRemoved(false);
                                setNotice({
                                    title: "저장 완료",
                                    message: "변경 사항이 적용되었습니다.",
                                });
                            },
                            onError: (uploadError: unknown) => {
                                setNotice({
                                    title: isPhotoRemoved ? "사진 삭제 실패" : "사진 저장 실패",
                                    message: `회원정보는 저장되었지만 사진은 ${isPhotoRemoved ? "삭제" : "저장"}하지 못했습니다. ${getApiErrorMessage(uploadError)}`,
                                });
                            },
                        };
                        if (isPhotoRemoved) deleteImage(undefined, photoOptions);
                        else if (photoFile) updateImage(photoFile, photoOptions);
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
    };
    const onFileSelect = (file: File | undefined) => {
        if (!file || !member || isBusy) return;
        if (!["image/jpeg", "image/png"].includes(file.type) || file.size > 5 * 1024 * 1024) {
            setNotice({
                title: "사진 선택 오류",
                message: "5MB 이하의 JPG 또는 PNG 파일을 선택해 주세요.",
            });
            return;
        }
        setPhoto(URL.createObjectURL(file));
        setPhotoFile(file);
        setIsPhotoRemoved(false);
    };

    return (
        <MyPageContent
            eyebrow="계정 설정"
            title="사용자 정보 설정"
            eyebrowClassName="text-[20px] leading-[30px] font-semibold tracking-[0.5px] text-[#83889e]"
            titleClassName="text-[#464646]"
        >
            <MyPanel className="w-full p-6 sm:p-8">
                {isError ? (
                    <div className="mb-6 flex items-center gap-3">
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={isFetching}
                            onClick={() => void refetch()}
                            className="hover:border-[#6653fb] hover:bg-[#fafbff] hover:text-[#6653fb] focus-visible:!border-[#6653fb] focus-visible:ring-3 focus-visible:!ring-[#6653fb]/30 dark:hover:bg-[#fafbff]"
                        >
                            다시 시도
                        </Button>
                    </div>
                ) : !member ? (
                    <p role="status" className="text-muted-foreground mb-6 text-[13px]">
                        회원정보를 불러오는 중입니다.
                    </p>
                ) : null}
                <MySettingsForm
                    form={form}
                    member={member}
                    isBusy={isBusy}
                    isUploading={isUploading}
                    profileImageUrl={profileImageUrl}
                    isPreview={Boolean(photo)}
                    onSubmit={onSubmit}
                    onFileSelect={onFileSelect}
                    onPhotoRemove={() => {
                        if (!member || isBusy) return;
                        setPhoto("");
                        setPhotoFile(null);
                        setIsPhotoRemoved(Boolean(member.profileImageUrl));
                    }}
                />
            </MyPanel>
            <MyResultDialog
                open={Boolean(dialog)}
                onOpenChange={(open) => {
                    if (!open) {
                        setNotice(null);
                        setDismissedQueryError(errorUpdatedAt);
                    }
                }}
                title={dialog?.title ?? ""}
                message={dialog?.message ?? ""}
            />
        </MyPageContent>
    );
}
