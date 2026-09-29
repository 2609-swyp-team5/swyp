"use client";

import type { ComponentProps } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";

import { Button } from "@/common/components/ui/Button";
import { cn } from "@/common/lib/utils";

type PaginationProps = Omit<ComponentProps<"nav">, "children"> & {
    page: number;
    totalPages: number;
    onPageChange: (page: number) => void;
    disabled?: boolean;
};

function Pagination({
    page,
    totalPages,
    onPageChange,
    disabled = false,
    className,
    "aria-label": ariaLabel = "페이지 탐색",
    ...props
}: PaginationProps) {
    return (
        <nav
            data-slot="pagination"
            aria-label={ariaLabel}
            className={cn("flex items-center justify-center gap-4", className)}
            {...props}
        >
            <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="이전 페이지"
                disabled={disabled || page <= 1}
                onClick={() => onPageChange(page - 1)}
                className="text-[#83889e]"
            >
                <ArrowLeft aria-hidden="true" className="size-3.5" />
            </Button>
            <div className="flex min-w-0 flex-wrap justify-center gap-2">
                {Array.from({ length: totalPages }, (_, index) => index + 1).map((number) => (
                    <Button
                        key={number}
                        type="button"
                        variant="outline"
                        size="icon"
                        aria-current={page === number ? "page" : undefined}
                        disabled={disabled}
                        onClick={() => onPageChange(number)}
                        className={cn(
                            "rounded-md text-[13px] leading-5 font-semibold tracking-[-0.5px]",
                            page === number
                                ? "border-[#363636] bg-[#363636] text-white hover:bg-[#363636] hover:text-white"
                                : "border-[#dedee6] bg-white text-[#83889e]",
                        )}
                    >
                        {number}
                    </Button>
                ))}
            </div>
            <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="다음 페이지"
                disabled={disabled || page >= totalPages}
                onClick={() => onPageChange(page + 1)}
                className="text-[#83889e]"
            >
                <ArrowRight aria-hidden="true" className="size-3.5" />
            </Button>
        </nav>
    );
}

export { Pagination };
