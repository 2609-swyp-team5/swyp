"use client";

import { Button } from "@/common/components/ui/Button";

type DirectRegisterActionsProps = {
    primaryLabel: string;
    primaryType?: "button" | "submit";
    primaryForm?: string;
    onPrimaryClick?: () => void;
    onExit: () => void;
    exitLabel?: string;
};

export function DirectRegisterActions({
    primaryLabel,
    primaryType = "button",
    primaryForm,
    onPrimaryClick,
    onExit,
    exitLabel = "나가기",
}: DirectRegisterActionsProps) {
    return (
        <div className="flex w-full max-w-[1144px] items-center justify-end gap-2 md:gap-3">
            <Button
                type="button"
                className="h-12 shrink-0 rounded-full border-0 bg-[#d3d3d3] px-6 py-3 text-[16px] leading-6 font-semibold tracking-[0.5px] text-white hover:bg-[#c6c6c6] md:h-[54px] md:px-[50px] md:text-[20px] md:leading-[30px]"
                onClick={onExit}
            >
                {exitLabel}
            </Button>
            <Button
                type={primaryType}
                form={primaryForm}
                onClick={onPrimaryClick}
                className="h-12 min-w-0 flex-1 rounded-full bg-[#6653fb] px-5 py-3 text-[16px] leading-6 font-semibold tracking-[0.5px] text-white hover:bg-[#5745e7] md:h-[54px] md:flex-none md:px-[50px] md:text-[20px] md:leading-[30px]"
            >
                {primaryLabel}
            </Button>
        </div>
    );
}
