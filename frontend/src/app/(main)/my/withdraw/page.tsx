"use client";

import { useState } from "react";
import { TriangleAlert } from "lucide-react";

import { Button } from "@/common/components/ui/Button";
import { Checkbox } from "@/common/components/ui/Checkbox";
import { Label } from "@/common/components/ui/Label";
import {
    AlertDialog,
    AlertDialogContent,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogCancel,
    AlertDialogAction,
} from "@/common/components/ui/AlertDialog";
import { MyPageContent, MyPanel } from "@/features/my/components/MyPageContent";
import { getApiErrorMessage } from "@/common/lib/api/error";
import { useWithdrawMutation } from "@/features/member/hooks/mutations/useWithdrawMutation";
import { useAuthStore } from "@/features/auth/store/authStore";

export default function MyWithdrawPage() {
    const [agreed, setAgreed] = useState(false);
    const [open, setOpen] = useState(false);
    const { mutate: withdraw, isPending, isSuccess, error, reset } = useWithdrawMutation();
    const clearAuth = useAuthStore((state) => state.clearAuth);
    return (
        <MyPageContent eyebrow="계정 관리" title="회원 탈퇴">
            <div className="w-full space-y-6">
                <div className="border-destructive/25 bg-destructive/5 text-destructive flex items-start gap-3 rounded-2xl border p-6">
                    <TriangleAlert className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
                    <div>
                        <h2 className="mb-2 text-base font-semibold">탈퇴 전 꼭 확인해주세요</h2>
                        <ul className="list-disc space-y-2 pl-4 text-[13px] leading-5">
                            <li>등록된 모든 상품과 분석 데이터가 삭제됩니다.</li>
                            <li>연결된 중고 플랫폼 동기화가 해제됩니다.</li>
                            <li>AI 추천 알림 이력이 모두 삭제됩니다.</li>
                            <li>삭제된 계정과 데이터는 복구할 수 없습니다.</li>
                        </ul>
                    </div>
                </div>
                <MyPanel className="gap-6 p-6 sm:p-8">
                    <p className="text-muted-foreground">
                        탈퇴를 계속하려면 아래 내용에 동의하고 다음 단계로 진행해주세요.
                    </p>
                    <div className="flex items-start gap-3">
                        <Checkbox
                            id="withdraw-agreement"
                            checked={agreed}
                            disabled={isPending}
                            onCheckedChange={(value) => setAgreed(value === true)}
                            className="mt-1"
                        />
                        <Label
                            htmlFor="withdraw-agreement"
                            className="text-muted-foreground text-[13px] leading-5 font-normal"
                        >
                            위 내용을 모두 확인했으며, 계정 탈퇴에 동의합니다.
                        </Label>
                    </div>
                    <Button
                        disabled={!agreed || isPending}
                        onClick={() => {
                            reset();
                            setOpen(true);
                        }}
                        className="bg-destructive text-primary-foreground hover:bg-destructive/80 h-[50px] rounded-xl text-base font-semibold"
                    >
                        다음 단계
                    </Button>
                </MyPanel>
            </div>
            <AlertDialog
                open={open}
                onOpenChange={(value) => {
                    if (isPending) return;
                    if (!value && isSuccess) clearAuth();
                    else {
                        if (!value) reset();
                        setOpen(value);
                    }
                }}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            {isSuccess
                                ? "회원 탈퇴가 완료되었습니다."
                                : error
                                  ? "회원 탈퇴 실패"
                                  : "회원 탈퇴를 진행할까요?"}
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            {isSuccess
                                ? "확인을 누르면 로그인 화면으로 이동합니다."
                                : error
                                  ? getApiErrorMessage(error)
                                  : "탈퇴 시 등록된 상품과 분석 데이터가 삭제되며 복구할 수 없습니다."}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        {isSuccess || error ? (
                            <AlertDialogAction>확인</AlertDialogAction>
                        ) : (
                            <>
                                <AlertDialogCancel disabled={isPending}>취소</AlertDialogCancel>
                                <AlertDialogAction
                                    className="bg-destructive text-primary-foreground hover:bg-destructive/80"
                                    disabled={!agreed || isPending}
                                    onClick={(event) => {
                                        event.preventDefault();
                                        if (agreed && !isPending) withdraw();
                                    }}
                                >
                                    {isPending ? "탈퇴 처리 중..." : "탈퇴하기"}
                                </AlertDialogAction>
                            </>
                        )}
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </MyPageContent>
    );
}
