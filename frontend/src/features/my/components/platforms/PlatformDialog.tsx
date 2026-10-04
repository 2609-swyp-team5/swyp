"use client";

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
import type { PlatformConnection } from "@/features/my/components/platforms/PlatformCard";

const buttonFocusClassName =
    "focus-visible:!border-[#6653fb] focus-visible:ring-3 focus-visible:!ring-[#6653fb]/30";

type PlatformDialogProps = {
    selected: PlatformConnection | null;
    disconnecting: boolean;
    onOpenChange: (open: boolean) => void;
    onConfirm: () => void;
    isPending: boolean;
    errorMessage: string | null;
};

export function PlatformDialog({
    selected,
    disconnecting,
    onOpenChange,
    onConfirm,
    isPending,
    errorMessage,
}: PlatformDialogProps) {
    return (
        <AlertDialog open={selected !== null} onOpenChange={onOpenChange}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>
                        {selected?.name} {disconnecting ? "연결 해제" : "연결"}
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                        {disconnecting
                            ? "연결을 해제하면 해당 플랫폼의 판매 상태 동기화가 중단됩니다."
                            : "이 플랫폼과 연결하고 판매 상태를 동기화할까요?"}
                    </AlertDialogDescription>
                </AlertDialogHeader>
                {errorMessage && (
                    <p role="alert" className="text-destructive text-sm">
                        {errorMessage}
                    </p>
                )}
                <AlertDialogFooter>
                    <AlertDialogCancel
                        disabled={isPending}
                        className={`hover:!border-[#6653fb] hover:!bg-[#fafbff] hover:!text-[#6653fb] dark:hover:!bg-[#fafbff] ${buttonFocusClassName}`}
                    >
                        취소
                    </AlertDialogCancel>
                    <AlertDialogAction
                        disabled={isPending}
                        onClick={(event) => {
                            event.preventDefault();
                            onConfirm();
                        }}
                        className={`hover:!bg-[#5745e7] dark:hover:!bg-[#5745e7] ${buttonFocusClassName}`}
                    >
                        {isPending ? "처리 중..." : disconnecting ? "연결 해제" : "연결하기"}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
