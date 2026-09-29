"use client";

import type { ReactNode } from "react";

import Image from "next/image";
import { X } from "lucide-react";

import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogTitle,
} from "@/common/components/ui/AlertDialog";

type SellAlertDialogProps = {
    open: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: ReactNode;
    description: ReactNode;
    confirmLabel: string;
    cancelLabel: string;
    confirmDisabled?: boolean;
    cancelDisabled?: boolean;
    preventCloseOnConfirm?: boolean;
    overlayClassName?: string;
};

export function SellAlertDialog({
    open,
    onClose,
    onConfirm,
    title,
    description,
    confirmLabel,
    cancelLabel,
    confirmDisabled = false,
    cancelDisabled = false,
    preventCloseOnConfirm = false,
    overlayClassName,
}: SellAlertDialogProps) {
    return (
        <AlertDialog open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
            <AlertDialogContent
                overlayClassName={overlayClassName}
                className="top-[10%] flex w-[calc(100%-3rem)] !max-w-[600px] translate-y-0 flex-col items-end gap-0 rounded-2xl border border-[#dee5ed] bg-white p-10 ring-0"
            >
                <AlertDialogCancel
                    aria-label="닫기"
                    disabled={cancelDisabled}
                    className="!size-[19px] !border-0 !bg-transparent !p-0 !text-[#d3d3d3] !shadow-none hover:!bg-transparent hover:!text-[#d3d3d3]"
                >
                    <X aria-hidden="true" className="size-[22px]" strokeWidth={1.8} />
                </AlertDialogCancel>

                <div className="flex w-full flex-col items-center gap-3 text-center">
                    <Image
                        src="/figma/ai-warning-icon.svg"
                        alt=""
                        width={66}
                        height={66}
                        unoptimized
                        className="size-[66px]"
                    />
                    <div className="flex w-full flex-col items-center gap-2">
                        <AlertDialogTitle className="text-[30px] leading-[42px] font-bold tracking-[0.5px] text-[#545d82]">
                            {title}
                        </AlertDialogTitle>
                        <AlertDialogDescription className="text-[16px] leading-[25px] text-[#6b7395]">
                            {description}
                        </AlertDialogDescription>
                    </div>
                </div>

                <div className="mt-[30px] flex w-full items-center justify-center gap-3">
                    <AlertDialogAction
                        disabled={confirmDisabled}
                        className="h-[35px] w-[120px] rounded-full !border-0 !bg-[#d3d3d3] px-8 py-1 text-[16px] leading-[25px] font-semibold tracking-[0.5px] !text-white hover:!bg-[#b8b8b8]"
                        onClick={(event) => {
                            if (preventCloseOnConfirm) event.preventDefault();
                            onConfirm();
                        }}
                    >
                        {confirmLabel}
                    </AlertDialogAction>
                    <AlertDialogCancel
                        disabled={cancelDisabled}
                        className="h-[35px] rounded-full !border-0 !bg-[#6653fb] px-[30px] py-1 text-[16px] leading-[25px] font-semibold tracking-[0.5px] !text-white hover:!bg-[#5844e8]"
                    >
                        {cancelLabel}
                    </AlertDialogCancel>
                </div>
            </AlertDialogContent>
        </AlertDialog>
    );
}
