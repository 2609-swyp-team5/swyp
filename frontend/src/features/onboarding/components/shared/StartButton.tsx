"use client";

import Link from "next/link";
import type { MouseEvent } from "react";
import { Button } from "@/common/components/ui/Button";

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
            className="group relative h-[74px] overflow-hidden rounded-[50px] border-0 bg-[#6653fb] px-14 py-0 text-[30px] leading-[42px] font-bold tracking-[0.5px] text-white transition-[background-color,translate,scale,box-shadow] duration-300 hover:shadow-[0_12px_32px_rgba(108,83,255,0.3)] focus-visible:shadow-[0_12px_32px_rgba(108,83,255,0.3)] motion-safe:hover:-translate-y-1 motion-safe:active:scale-[0.96] motion-reduce:transition-none"
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
            </Link>
        </Button>
    );
}
