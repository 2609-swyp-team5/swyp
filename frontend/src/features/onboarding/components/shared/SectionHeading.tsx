"use client";

import type { ReactNode } from "react";
import * as m from "motion/react-m";
import { cn } from "@/common/lib/utils";
import { revealMotion } from "@/features/onboarding/onboardingMotion";

export function SectionHeading({
    id,
    eyebrow,
    title,
    titleClassName,
}: {
    id: string;
    eyebrow: string;
    title: ReactNode;
    /** 절반 칸에 들어가는 섹션처럼 제목 크기를 바꿔야 할 때 덮어쓴다 */
    titleClassName?: string;
}) {
    return (
        <m.div id={id} {...revealMotion}>
            <div className="space-y-2.5">
                <p className="typography-body-medium text-base leading-7 font-semibold text-[#6b6c7b] md:text-[20px] md:leading-[30px]">
                    {eyebrow}
                </p>
                <h2
                    className={cn(
                        "typography-heading-01 text-[32px] leading-[42px] text-[#363636] md:text-[48px] md:leading-[60px] xl:text-[length:var(--type-heading-01-size)] xl:leading-[var(--type-heading-01-line-height)]",
                        titleClassName,
                    )}
                >
                    {title}
                </h2>
            </div>
        </m.div>
    );
}
