import type { ReactNode } from "react";

import { Card } from "@/common/components/ui/Card";
import { cn } from "@/common/lib/utils";

export function MyPageContent({
    eyebrow,
    title,
    children,
    eyebrowClassName,
    titleClassName,
}: {
    eyebrow: string;
    title: string;
    children: ReactNode;
    eyebrowClassName?: string;
    titleClassName?: string;
}) {
    return (
        <main className="text-foreground px-6 py-12 text-base leading-[25px] font-normal break-keep sm:px-10 lg:py-[60px] xl:px-[min(7vw,var(--grid-margin))]">
            <div className="mx-auto w-full max-w-[960px]">
                <header className="mb-10">
                    <p
                        className={cn(
                            "text-muted-foreground mb-1 pl-1 font-normal",
                            eyebrowClassName,
                        )}
                    >
                        {eyebrow}
                    </p>
                    <h1
                        className={cn(
                            "typography-heading-03 text-[44px] leading-[52px] font-bold tracking-[0.5px]",
                            titleClassName,
                        )}
                    >
                        {title}
                    </h1>
                </header>
                {children}
            </div>
        </main>
    );
}

export function MyPanel({ children, className }: { children: ReactNode; className?: string }) {
    return (
        <Card
            className={cn(
                "text-foreground border-border gap-0 rounded-2xl border p-6 text-base leading-[25px] shadow-[0_1px_2px_rgba(0,0,0,0.05)] ring-0",
                className,
            )}
        >
            {children}
        </Card>
    );
}
