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
                <p className="typography-heading-03 font-semibold text-[#6b6c7b]">{eyebrow}</p>
                <h2 className={cn("typography-heading-01 text-[#363636]", titleClassName)}>
                    {title}
                </h2>
            </div>
        </m.div>
    );
}
