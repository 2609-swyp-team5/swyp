"use client";

import Image from "next/image";

import { Button } from "@/common/components/ui/Button";
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogTitle,
} from "@/common/components/ui/Dialog";

type ExitDialogProps = {
    open: boolean;
    onClose: () => void;
    onConfirm: () => void;
};

export function ExitDialog({ open, onClose, onConfirm }: ExitDialogProps) {
    return (
        <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
            <DialogContent className="flex w-[calc(100%-3rem)] max-w-[600px] flex-col items-end gap-0 rounded-2xl border-[#dee5ed] bg-white p-10">
                <DialogClose asChild>
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        aria-label="닫기"
                        className="size-[19px] p-0 text-[#d3d3d3] hover:bg-transparent hover:text-[#6b6c7b]"
                    >
                        <Image
                            src="/figma/dialog-close-icon.svg"
                            alt=""
                            width={22}
                            height={22}
                            unoptimized
                            className="size-[22px]"
                        />
                    </Button>
                </DialogClose>

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
                        <DialogTitle className="text-[30px] leading-[42px] font-bold tracking-[0.5px] text-[#545d82]">
                            작성한 내용이 모두 삭제됩니다
                        </DialogTitle>
                        <DialogDescription className="text-[16px] leading-[25px] text-[#6b7395]">
                            현재 작성 중인 내용은 저장되지 않으며,
                            <br />
                            나가면 다시 복구할 수 없습니다.
                        </DialogDescription>
                    </div>
                </div>

                <div className="mt-[30px] flex w-full items-center justify-center gap-3">
                    <Button
                        type="button"
                        className="h-[35px] w-[120px] rounded-full border-0 bg-[#d3d3d3] px-8 py-1 text-[16px] leading-[25px] font-semibold tracking-[0.5px] text-white hover:bg-[#c6c6c6]"
                        onClick={onConfirm}
                    >
                        나가기
                    </Button>
                    <DialogClose asChild>
                        <Button
                            type="button"
                            className="h-[35px] rounded-full bg-[#6653fb] px-[30px] py-1 text-[16px] leading-[25px] font-semibold tracking-[0.5px] text-white hover:bg-[#5745e7]"
                        >
                            돌아가기
                        </Button>
                    </DialogClose>
                </div>
            </DialogContent>
        </Dialog>
    );
}
