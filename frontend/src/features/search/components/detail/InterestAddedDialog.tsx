"use client";

import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogTitle,
} from "@/common/components/ui/AlertDialog";

/** 관심상품 등록 성공 후 어떤 알림을 받게 되는지 안내한다(Figma 1854-7930) */
export function InterestAddedDialog({
    open,
    onOpenChange,
    price,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    /** 등록 시점의 상품 가격 — 이보다 내려가면 알림 대상이 된다 */
    price: number;
}) {
    const conditions = [
        "AI 분석이 '구매 추천'으로 변경될 때",
        `가격이 ${price.toLocaleString("ko-KR")}원 이하로 내려갈 때`,
        "판매 상태가 변경될 때",
    ];
    return (
        <AlertDialog open={open} onOpenChange={onOpenChange}>
            <AlertDialogContent className="flex max-w-[calc(100%-2rem)] flex-col gap-[35px] rounded-2xl border border-[#dee5ed] bg-white p-[33px] ring-0 data-[size=default]:max-w-[420px] data-[size=default]:sm:max-w-[420px]">
                <div className="flex flex-col">
                    <AlertDialogTitle className="text-[20px] leading-[30px] font-bold text-[#545d82]">
                        관심상품으로 등록했어요!
                    </AlertDialogTitle>
                    <AlertDialogDescription className="pt-1 text-left text-[14px] leading-[21px] text-[#6b7395] md:text-left">
                        AI가 가격 변화를 추적하고 좋은 시점에 알려드릴게요.
                    </AlertDialogDescription>
                </div>
                <ul className="flex list-disc flex-col gap-[5px] ps-[21px] text-[14px] leading-[21px] text-[#545d82]">
                    {conditions.map((condition) => (
                        <li key={condition}>{condition}</li>
                    ))}
                </ul>
                <AlertDialogAction className="h-[46.5px] w-full rounded-full! bg-[#5d55fe] text-[15px] leading-[22.5px] font-semibold text-white hover:bg-[#4f47e8]">
                    확인
                </AlertDialogAction>
            </AlertDialogContent>
        </AlertDialog>
    );
}
