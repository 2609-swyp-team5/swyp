"use client";

import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogTitle,
} from "@/common/components/ui/AlertDialog";

/**
 * 관심상품 등록 성공 후 어떤 알림을 받게 되는지 안내한다(Figma 1854-7930). 실제로 보내는 구매자 알림(구매 추천·보류 전환, 평균 시세
 * 5% 이상 변동, 목표 구매가 도달)만 적는다 — 목표가는 관심 등록 때 비어 있어 따로 정해야 알림이 온다.
 */
const conditions = [
    "AI 분석이 '구매 추천'이나 '구매 보류'로 바뀔 때",
    "평균 시세가 5% 넘게 오르거나 내릴 때",
    "목표 구매가를 정해 두면, 가격이 그 아래로 내려갈 때(관심 상품 목록에서 정할 수 있어요)",
];

export function InterestAddedDialog({
    open,
    onOpenChange,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}) {
    return (
        <AlertDialog open={open} onOpenChange={onOpenChange}>
            <AlertDialogContent className="flex max-w-[calc(100%-2rem)] flex-col gap-[35px] rounded-2xl border border-[#dee5ed] bg-white p-[33px] ring-0 data-[size=default]:max-w-[420px] data-[size=default]:sm:max-w-[420px]">
                <div className="flex flex-col">
                    <AlertDialogTitle className="typography-heading-03 font-bold text-[#545d82]">
                        관심상품으로 등록했어요!
                    </AlertDialogTitle>
                    <AlertDialogDescription className="typography-body-small pt-1 text-left text-[#6b7395] md:text-left">
                        AI가 가격 변화를 추적하고 좋은 시점에 알려드릴게요.
                    </AlertDialogDescription>
                </div>
                <ul className="typography-body-small flex list-disc flex-col gap-[5px] ps-[21px] text-[#545d82]">
                    {conditions.map((condition) => (
                        <li key={condition}>{condition}</li>
                    ))}
                </ul>
                <AlertDialogAction className="typography-body-bold h-[46.5px] w-full rounded-full! bg-[#5d55fe] font-semibold text-white hover:bg-[#4f47e8]">
                    확인
                </AlertDialogAction>
            </AlertDialogContent>
        </AlertDialog>
    );
}
