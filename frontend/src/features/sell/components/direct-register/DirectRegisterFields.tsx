import type { ReactNode } from "react";

import { CircleAlert } from "lucide-react";

import { Alert, AlertDescription } from "@/common/components/ui/Alert";
import { Label } from "@/common/components/ui/Label";
import { cn } from "@/common/lib/utils";

type FieldLabelProps = {
    htmlFor?: string;
    required?: boolean;
    children: ReactNode;
};

type FieldLegendProps = Pick<FieldLabelProps, "required" | "children"> & {
    className?: string;
};

export function FieldLabel({ htmlFor, required = false, children }: FieldLabelProps) {
    return (
        <div className="flex min-h-[21px] items-center gap-3">
            <Label
                htmlFor={htmlFor}
                className="text-[16px] leading-[25px] font-semibold tracking-[0.5px] text-[#464646]"
            >
                {children}
                {required && <span aria-hidden="true"> *</span>}
            </Label>
        </div>
    );
}

export function FieldLegend({ required = false, children, className }: FieldLegendProps) {
    return (
        <legend
            className={cn(
                "text-[16px] leading-[25px] font-semibold tracking-[0.5px] text-[#464646]",
                className,
            )}
        >
            {children}
            {required && <span aria-hidden="true"> *</span>}
        </legend>
    );
}

export function FieldError({ message }: { message?: string }) {
    if (!message) {
        return null;
    }

    return (
        <Alert
            variant="destructive"
            className="flex w-fit items-center gap-2 border-0 bg-transparent p-0 shadow-none"
        >
            <span className="flex size-4 shrink-0 items-center justify-center">
                <CircleAlert aria-hidden="true" className="size-4" />
            </span>
            <AlertDescription className="text-destructive p-0 text-[12px] leading-[18px]">
                {message}
            </AlertDescription>
        </Alert>
    );
}
