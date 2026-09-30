"use client";

import Link from "next/link";
import type { MouseEvent } from "react";
import { ArrowRight } from "lucide-react";
import { Button } from "@/common/components/ui/Button";
import { cn } from "@/common/lib/utils";

export function StartButton({
    href,
    isInitialized,
    compact = false,
}: {
    href: string;
    isInitialized: boolean;
    compact?: boolean;
}) {
    const handleStartClick = (event: MouseEvent<HTMLAnchorElement>) => {
        if (!isInitialized) event.preventDefault();
    };

    return (
        <Button
            asChild
            className={cn(
                "group relative h-auto gap-3 overflow-hidden rounded-full px-14 transition-[background-color,translate,scale,box-shadow] duration-300 hover:shadow-[0_12px_32px_rgba(108,83,255,0.3)] focus-visible:shadow-[0_12px_32px_rgba(108,83,255,0.3)] motion-safe:hover:-translate-y-1 motion-safe:active:scale-[0.96] motion-reduce:transition-none",
                compact
                    ? "typography-body-medium min-h-[54px] text-[length:var(--type-body-medium-size)] leading-[var(--type-body-medium-line-height)] font-semibold"
                    : "typography-heading-03 min-h-16 text-[length:var(--type-heading-03-size)] leading-[var(--type-heading-03-line-height)] font-semibold",
            )}
        >
            <Link
                href={href}
                aria-disabled={!isInitialized}
                tabIndex={isInitialized ? undefined : -1}
                onClick={handleStartClick}
                aria-label={compact ? "지금 시작하기" : undefined}
            >
                <span
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-y-0 -left-1/2 w-1/3 -skew-x-12 bg-white/20 opacity-0 motion-safe:transition-[translate,opacity] motion-safe:duration-700 motion-safe:group-hover:translate-x-[500%] motion-safe:group-hover:opacity-100 motion-safe:group-focus-visible:translate-x-[500%] motion-safe:group-focus-visible:opacity-100"
                />
                시작하기
                <ArrowRight
                    aria-hidden="true"
                    className="size-5 motion-safe:transition-transform motion-safe:group-hover:translate-x-1"
                />
            </Link>
        </Button>
    );
}
