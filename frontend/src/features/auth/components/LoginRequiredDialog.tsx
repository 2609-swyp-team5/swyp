"use client";

import { useRouter } from "next/navigation";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/common/components/ui/AlertDialog";

export function LoginRequiredDialog({
    open,
    onOpenChange,
}: {
    open: boolean;
    onOpenChange?: (open: boolean) => void;
}) {
    const router = useRouter();
    return (
        <AlertDialog open={open} onOpenChange={onOpenChange}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>로그인이 필요합니다</AlertDialogTitle>
                    <AlertDialogDescription>로그인 후 사용해 주세요.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogAction onClick={() => router.replace("/login")}>
                        확인
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
