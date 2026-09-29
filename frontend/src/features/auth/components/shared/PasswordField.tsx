"use client";

import type { ComponentProps } from "react";
import { Eye, EyeOff } from "lucide-react";

import { Button } from "@/common/components/ui/Button";
import { Input } from "@/common/components/ui/Input";
import { cn } from "@/common/lib/utils";

type PasswordFieldProps = Omit<ComponentProps<typeof Input>, "type"> & {
    showPassword: boolean;
    onVisibilityChange: (visible: boolean) => void;
    visibilityLabel?: string;
};

export function PasswordField({
    showPassword,
    onVisibilityChange,
    visibilityLabel = "비밀번호",
    className,
    ...props
}: PasswordFieldProps) {
    return (
        <div className="relative">
            <Input
                {...props}
                type={showPassword ? "text" : "password"}
                className={cn(
                    "text-foreground aria-invalid:focus-visible:border-destructive h-12 rounded-xl pr-12 pl-4 text-base focus-visible:border-[#6653fb] focus-visible:ring-0 md:text-base",
                    className,
                )}
            />
            <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={`${visibilityLabel} ${showPassword ? "숨기기" : "표시"}`}
                aria-pressed={showPassword}
                onClick={() => onVisibilityChange(!showPassword)}
                className="text-muted-foreground absolute top-[calc(50%-1rem)] right-2 hover:bg-[#efeeff] hover:text-[#6653fb] focus-visible:!border-[#6653fb] focus-visible:ring-3 focus-visible:!ring-[#6653fb]/30 dark:hover:bg-[#efeeff]"
            >
                {showPassword ? <Eye className="size-5" /> : <EyeOff className="size-5" />}
            </Button>
        </div>
    );
}
