import type { ReactNode } from "react";
import Link from "next/link";

import { ArrowRight, Check } from "lucide-react";

import { Button } from "@/common/components/ui/Button";
import { cn } from "@/common/lib/utils";

type RegisterMethodCardProps = {
    title: string;
    description: string;
    features: readonly string[];
    href: string;
    icon: ReactNode;
    tone: "ai" | "direct";
    className?: string;
};

const toneStyles = {
    ai: {
        card: "border-[#83889e] bg-[#fafbff]",
        icon: "bg-[#b1a9ef] text-[#363636]",
        button: "bg-[#6653fb] text-white hover:bg-[#5745e7]",
    },
    direct: {
        card: "border-[#d3d3d3] bg-white",
        icon: "bg-[#7e89bb] text-white",
        button: "bg-[#7e89bb] text-white hover:bg-[#6e79ac]",
    },
} as const;

export function RegisterMethodCard({
    title,
    description,
    features,
    href,
    icon,
    tone,
    className,
}: RegisterMethodCardProps) {
    const styles = toneStyles[tone];

    return (
        <article
            className={cn(
                "flex min-h-[444px] flex-col rounded-2xl border p-8",
                className,
                styles.card,
            )}
        >
            <div className="flex flex-col gap-10">
                <div className="flex flex-col gap-5">
                    <div className="flex items-center gap-4">
                        <span
                            aria-hidden="true"
                            className={cn(
                                "flex size-12 shrink-0 items-center justify-center rounded-xl",
                                styles.icon,
                            )}
                        >
                            {icon}
                        </span>
                        <h2 className="typography-heading-03 text-[#363636]">{title}</h2>
                    </div>
                    <p className="typography-body-medium text-[#464646]">{description}</p>
                </div>

                <ul className="typography-body-medium flex flex-col gap-3 text-[#464646]/80">
                    {features.map((feature) => (
                        <li key={feature} className="flex items-center gap-1">
                            <Check
                                aria-hidden="true"
                                className="size-5 shrink-0"
                                strokeWidth={1.5}
                            />
                            <span>{feature}</span>
                        </li>
                    ))}
                </ul>
            </div>

            <Button
                asChild
                className={cn(
                    "typography-body-medium mt-auto h-[54px] rounded-full px-6 py-3 font-semibold",
                    styles.button,
                )}
            >
                <Link href={href}>
                    <span>{tone === "ai" ? "AI 등록 시작하기" : "직접 등록 시작하기"}</span>
                    <ArrowRight aria-hidden="true" className="size-5" />
                </Link>
            </Button>
        </article>
    );
}
