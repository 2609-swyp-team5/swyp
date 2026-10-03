"use client";

import { TriangleAlert, X } from "lucide-react";
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

const buttonFocusClassName =
    "focus-visible:!border-[#6653fb] focus-visible:ring-3 focus-visible:!ring-[#6653fb]/30";

type WithdrawalDialogProps = {
    open: boolean;
    agreed: boolean;
    isPending: boolean;
    isSuccess: boolean;
    confirming: boolean;
    errorMessage: string;
    onOpenChange: (open: boolean) => void;
    onConfirm: () => void;
};
export function WithdrawalDialog({
    open,
    agreed,
    isPending,
    isSuccess,
    confirming,
    errorMessage,
    onOpenChange,
    onConfirm,
}: WithdrawalDialogProps) {
    return (
        <AlertDialog open={open} onOpenChange={onOpenChange}>
            <AlertDialogContent
                className={
                    confirming
                        ? "min-h-[343px] w-[calc(100vw-32px)] !max-w-[600px] rounded-[12px] !bg-white px-6 pt-[60px] pb-10 text-center sm:top-[192px] sm:translate-y-0 sm:px-[40px]"
                        : undefined
                }
                overlayClassName={confirming ? "!bg-black/40 !backdrop-blur-none" : undefined}
            >
                {confirming ? (
                    <>
                        <AlertDialogCancel
                            aria-label="취소"
                            disabled={isPending}
                            className={`!absolute top-6 right-6 !size-[22px] border-0 bg-transparent !p-0 hover:!bg-transparent sm:top-8 sm:right-8 dark:hover:!bg-transparent ${buttonFocusClassName}`}
                        >
                            <X
                                aria-hidden="true"
                                className="size-[22px] text-[#d3d3d3]"
                                strokeWidth={2}
                            />
                        </AlertDialogCancel>
                        <div className="flex w-full flex-col items-center text-center">
                            <TriangleAlert
                                aria-hidden="true"
                                className="size-[66px] text-[#6653fb]"
                                strokeWidth={1.5}
                            />
                            <AlertDialogTitle className="mt-3 text-[24px] leading-[34px] font-bold tracking-[0.5px] text-[#545d82] sm:text-[30px] sm:leading-[42px]">
                                회원 탈퇴를 진행하시겠습니까?
                            </AlertDialogTitle>
                            <AlertDialogDescription className="mt-2 text-[16px] leading-[25px] text-[#6b7395]">
                                탈퇴 이후에는 계정 복구가 불가능하며,
                                <br />
                                모든 데이터가 영구삭제됩니다.
                            </AlertDialogDescription>
                        </div>
                        <div className="mt-[30px] flex w-full flex-row justify-center gap-3">
                            <AlertDialogAction
                                className={`h-[35px] w-[120px] rounded-full !bg-[#d3d3d3] px-8 text-[16px] font-semibold tracking-[0.5px] !text-white hover:!bg-[#c6c6c6] dark:hover:!bg-[#c6c6c6] ${buttonFocusClassName}`}
                                disabled={!agreed || isPending}
                                onClick={(event) => {
                                    event.preventDefault();
                                    onConfirm();
                                }}
                            >
                                {isPending ? "탈퇴 처리 중..." : "탈퇴하기"}
                            </AlertDialogAction>
                            <AlertDialogCancel
                                disabled={isPending}
                                className={`h-[35px] rounded-full border-0 !bg-[#6653fb] px-[30px] text-[16px] font-semibold tracking-[0.5px] !text-white hover:!bg-[#5745e7] dark:hover:!bg-[#5745e7] ${buttonFocusClassName}`}
                            >
                                나가기
                            </AlertDialogCancel>
                        </div>
                    </>
                ) : (
                    <>
                        <AlertDialogHeader>
                            <AlertDialogTitle>
                                {isSuccess ? "회원 탈퇴가 완료되었습니다." : "회원 탈퇴 실패"}
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                                {isSuccess
                                    ? "확인을 누르면 로그인 화면으로 이동합니다."
                                    : errorMessage}
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogAction
                                className={`hover:!bg-[#5745e7] dark:hover:!bg-[#5745e7] ${buttonFocusClassName}`}
                            >
                                확인
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </>
                )}
            </AlertDialogContent>
        </AlertDialog>
    );
}
