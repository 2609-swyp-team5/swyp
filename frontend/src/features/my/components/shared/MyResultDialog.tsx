"use client";
import {
    AlertDialog,
    AlertDialogContent,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogAction,
} from "@/common/components/ui/AlertDialog";
type MyResultDialogProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title: string;
    message: string;
};
export function MyResultDialog({ open, onOpenChange, title, message }: MyResultDialogProps) {
    return (
        <AlertDialog open={open} onOpenChange={onOpenChange}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>{title}</AlertDialogTitle>
                    <AlertDialogDescription>{message}</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogAction className="hover:!bg-[#5745e7] focus-visible:!border-[#6653fb] focus-visible:ring-3 focus-visible:!ring-[#6653fb]/30 dark:hover:!bg-[#5745e7]">
                        확인
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
