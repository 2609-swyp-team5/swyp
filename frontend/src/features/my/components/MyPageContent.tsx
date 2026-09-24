import type { ReactNode } from "react";

import { Card } from "@/common/components/ui/Card";
import { cn } from "@/common/lib/utils";

export function MyPageContent({
    eyebrow,
    title,
    children,
}: {
    eyebrow: string;
    title: string;
    children: ReactNode;
}) {
    return (
        <main className="text-foreground px-6 py-12 text-base leading-[25px] font-normal break-keep sm:px-10 lg:py-[60px] xl:px-[min(7vw,var(--grid-margin))]">
            <div className="mx-auto w-full max-w-[960px]">
                <header className="mb-10">
                    <p className="text-muted-foreground mb-1 font-normal">{eyebrow}</p>
                    <h1 className="typography-heading-03 leading-[42px] font-bold">{title}</h1>
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
