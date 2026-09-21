"use client";

import { Button } from "@/common/components/ui/Button";

type DirectRegisterActionsProps = {
    primaryLabel: string;
    primaryType?: "button" | "submit";
    primaryForm?: string;
    onExit: () => void;
};

export function DirectRegisterActions({
    primaryLabel,
    primaryType = "button",
    primaryForm,
    onExit,
}: DirectRegisterActionsProps) {
    return (
        <div className="flex w-full max-w-[1144px] items-center justify-end gap-3">
            <Button
                type="button"
                className="h-[54px] rounded-full border-0 bg-[#d3d3d3] px-[50px] py-3 text-[20px] leading-[30px] font-semibold tracking-[0.5px] text-white hover:bg-[#c6c6c6]"
                onClick={onExit}
            >
                나가기
            </Button>
            <Button
                type={primaryType}
                form={primaryForm}
                className="h-[54px] rounded-full bg-[#6653fb] px-[50px] py-3 text-[20px] leading-[30px] font-semibold tracking-[0.5px] text-white hover:bg-[#5745e7]"
            >
                {primaryLabel}
            </Button>
        </div>
    );
}
