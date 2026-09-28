"use client";

import { useState } from "react";
import { Info, TriangleAlert, X } from "lucide-react";

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
import { MyPageContent } from "@/features/my/components/MyPageContent";
import { getApiErrorMessage } from "@/common/lib/api/error";
import { useWithdrawMutation } from "@/features/member/hooks/mutations/useWithdrawMutation";
import { useAuthStore } from "@/features/auth/store/authStore";

const withdrawalGuidance = [
    "탈퇴 후에는 모든 개인 정보와 서비스 이용 기록이 즉시 삭제됩니다.",
    "현재 진행 중인 결제 및 구독 서비스는 자동으로 해지되며, 환불 규정에 따라 처리됩니다.",
    "탈퇴 후 동일한 이메일로 재가입이 가능하며, 기존 데이터는 복구되지 않습니다.",
];

export default function MyWithdrawPage() {
    const [agreedToGuidance, setAgreedToGuidance] = useState(false);
    const [agreedToDeletion, setAgreedToDeletion] = useState(false);
    const [open, setOpen] = useState(false);
    const { mutate: withdraw, isPending, isSuccess, error, reset } = useWithdrawMutation();
    const clearAuth = useAuthStore((state) => state.clearAuth);
    const agreed = agreedToGuidance && agreedToDeletion;
    const confirming = !isSuccess && !error;

    return (
        <MyPageContent
            eyebrow="계정 관리"
            title="회원 탈퇴"
            eyebrowClassName="text-[20px] leading-[30px] font-semibold tracking-[0.5px] text-[#83889e]"
            titleClassName="text-[32px] leading-[42px] tracking-[0.5px] text-[#363636] sm:text-[40px] sm:leading-[50px] xl:text-[53px] xl:leading-[75px]"
        >
            <div className="pt-[40px]">
                <section className="rounded-[10px] bg-[#f1f1f1] p-[30px] text-[#fa503d]">
                    <h2 className="flex items-center gap-[5px] text-[20px] leading-[30px] font-semibold tracking-[0.5px]">
                        <TriangleAlert
                            aria-hidden="true"
                            className="size-[34px] shrink-0"
                            strokeWidth={2.5}
                        />
                        탈퇴 전 꼭 확인해주세요
                    </h2>
                    <ul className="mt-[15px] list-disc pl-[24px] text-[16px] leading-[25px]">
                        <li>등록된 모든 상품과 분석 데이터가 삭제됩니다.</li>
                        <li>연결된 중고 플랫폼 동기화가 해제됩니다.</li>
                        <li>AI 추천 알림 이력이 모두 삭제됩니다.</li>
                        <li>삭제된 계정과 데이터는 복구할 수 없습니다.</li>
                    </ul>
                </section>

                <div className="mt-10 space-y-1.5 text-[14px] leading-[21px] tracking-[-0.5px] text-[#464646]">
                    <p className="flex items-center gap-[5px]">
                        <Info aria-hidden="true" className="size-[18px] shrink-0" />
                        탈퇴를 계속하려면 아래 내용을 확인하고 동의해주세요.
                    </p>
                    <p className="flex items-center gap-[5px]">
                        <Info aria-hidden="true" className="size-[18px] shrink-0" />
                        탈퇴 후에는 계정 복구가 불가능하며, 모든 데이터가 영구 삭제됩니다.
                    </p>
                </div>

                <section className="mt-[30px] border-b border-[#6b6c7b] pb-[30px]">
                    <h2 className="text-[16px] leading-[25px] font-semibold tracking-[0.5px] text-[#464646]">
                        탈퇴 전 확인해야 할 핵심 안내
                    </h2>
                    <ol className="mt-5 space-y-3">
                        {withdrawalGuidance.map((item, index) => (
                            <li key={item} className="flex items-center gap-3">
                                <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-[#272727] text-[16px] leading-[25px] font-semibold text-white">
                                    {index + 1}
                                </span>
                                <span className="text-[16px] leading-[25px] text-[#464646]">
                                    {item}
                                </span>
                            </li>
                        ))}
                    </ol>
                </section>

                <section className="mt-[30px]">
                    <h2 className="text-[16px] leading-[25px] font-semibold tracking-[0.5px] text-[#464646]">
                        회원 탈퇴 약정 동의
                    </h2>
                    <div className="mt-5 space-y-3">
                        {[
                            {
                                id: "withdraw-guidance",
                                checked: agreedToGuidance,
                                onCheckedChange: setAgreedToGuidance,
                                label: "위 안내 사항을 모두 확인하였으며, 계정 탈퇴에 동의합니다.",
                            },
                            {
                                id: "withdraw-deletion",
                                checked: agreedToDeletion,
                                onCheckedChange: setAgreedToDeletion,
                                label: "개인 정보 및 서비스 이용 기록의 영구 삭제에 동의합니다.",
                            },
                        ].map((item) => (
                            <div key={item.id} className="flex items-center gap-2">
                                <Checkbox
                                    id={item.id}
                                    checked={item.checked}
                                    disabled={isPending}
                                    onCheckedChange={(value) =>
                                        item.onCheckedChange(value === true)
                                    }
                                    className="size-6 border-[#272727] bg-white data-checked:border-[#272727] data-checked:bg-[#272727] [&_svg]:!size-[18px]"
                                />
                                <Label
                                    htmlFor={item.id}
                                    className="cursor-pointer text-[14px] leading-[21px] font-semibold tracking-[0.07px] text-[#6b6c7b]"
                                >
                                    {item.label}
                                </Label>
                            </div>
                        ))}
                    </div>
                </section>

                <div className="mt-[70px] flex justify-end">
                    <Button
                        disabled={!agreed || isPending}
                        onClick={() => {
                            reset();
                            setOpen(true);
                        }}
                        className="h-[49px] min-w-[183px] rounded-full bg-[#6b6c7b] px-[60px] text-[16px] leading-[25px] font-normal text-white hover:bg-[#545565] disabled:opacity-100"
                    >
                        탈퇴 요청
                    </Button>
                </div>
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
                                className="!absolute top-6 right-6 !size-[22px] border-0 bg-transparent !p-0 hover:bg-transparent sm:top-8 sm:right-8"
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
                                    className="h-[35px] w-[120px] rounded-full !bg-[#d3d3d3] px-8 text-[16px] font-semibold tracking-[0.5px] !text-white hover:!bg-[#b8b8b8]"
                                    disabled={!agreed || isPending}
                                    onClick={(event) => {
                                        event.preventDefault();
                                        if (agreed && !isPending) withdraw();
                                    }}
                                >
                                    {isPending ? "탈퇴 처리 중..." : "탈퇴하기"}
                                </AlertDialogAction>
                                <AlertDialogCancel
                                    disabled={isPending}
                                    className="h-[35px] rounded-full border-0 !bg-[#6653fb] px-[30px] text-[16px] font-semibold tracking-[0.5px] !text-white hover:!bg-[#5844e8]"
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
                                        : getApiErrorMessage(error)}
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogAction>확인</AlertDialogAction>
                            </AlertDialogFooter>
                        </>
                    )}
                </AlertDialogContent>
            </AlertDialog>
        </MyPageContent>
    );
}
