"use client";

import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogTitle,
} from "@/common/components/ui/AlertDialog";

/** 외부 매물 판매글로 나가기 전 최신 상태를 다시 확인하도록 안내한다(Figma 1854-7794) */
export function ExternalListingDialog({
    open,
    onOpenChange,
    platformName,
    url,
    checkedAt,
    statusLabel,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    platformName: string;
    url: string;
    /** "3시간 전"처럼 마지막으로 상태를 확인한 시점 */
    checkedAt: string;
    statusLabel: string;
}) {
    return (
        <AlertDialog open={open} onOpenChange={onOpenChange}>
            <AlertDialogContent className="flex max-w-[calc(100%-2rem)] flex-col gap-5 rounded-2xl border border-[#dee5ed] bg-white p-[33px] ring-0 data-[size=default]:max-w-[420px] data-[size=default]:sm:max-w-[420px]">
                <div className="flex flex-col">
                    <AlertDialogTitle className="text-[20px] leading-[30px] font-bold text-[#545d82]">
                        외부 플랫폼으로 이동합니다
                    </AlertDialogTitle>
                    <AlertDialogDescription className="pt-2 text-left text-[14px] leading-[22px] text-[#6b7395] md:text-left">
                        상품 가격과 판매 상태는 외부 플랫폼에서 최종적으로 다시 확인해 주세요.
                    </AlertDialogDescription>
                </div>
                <p className="rounded-lg border border-[#dee5ed] bg-[#f8f9fc] px-4 py-3 text-[12px] leading-[18px] text-[#6b7395]">
                    마지막 확인: {checkedAt} · {statusLabel}
                </p>
                <div className="flex gap-3">
                    <AlertDialogCancel className="h-[48.5px] flex-1 rounded-full! border-[#dee5ed] bg-white text-[15px] leading-[22.5px] font-semibold text-[#6b7395] hover:bg-[#f8f9fc] hover:text-[#6b7395]">
                        취소
                    </AlertDialogCancel>
                    <AlertDialogAction
                        asChild
                        className="h-[48.5px] flex-1 rounded-full! bg-[#5d55fe] text-[15px] leading-[22.5px] font-semibold text-white hover:bg-[#4f47e8]"
                    >
                        <a href={url} target="_blank" rel="noopener noreferrer">
                            {platformName}에서 확인 →
                        </a>
                    </AlertDialogAction>
                </div>
            </AlertDialogContent>
        </AlertDialog>
    );
}
