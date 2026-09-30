"use client";

import * as m from "motion/react-m";
import { textRiseMotion } from "@/features/onboarding/onboardingMotion";
import { StartButton } from "@/features/onboarding/components/shared/StartButton";
import { OnboardingBackground } from "@/features/onboarding/components/shared/OnboardingBackground";

export function StartSection({
    startHref,
    isInitialized,
}: {
    startHref: string;
    isInitialized: boolean;
}) {
    return (
        <section className="relative isolate flex min-h-[630px] items-center justify-center overflow-hidden py-[100px]">
            <OnboardingBackground />
            <div className="layout-container relative space-y-[30px] text-center">
                <div className="space-y-2.5">
                    <m.h2
                        {...textRiseMotion}
                        className="typography-heading-01 text-[32px] leading-[42px] text-[#363636] md:text-[48px] md:leading-[60px] xl:text-[length:var(--type-heading-01-size)] xl:leading-[var(--type-heading-01-line-height)]"
                    >
                        지금, 타이밍을 확인해보세요.
                    </m.h2>
                    <m.p
                        {...textRiseMotion}
                        transition={{ ...textRiseMotion.transition, delay: 0.18 }}
                        className="typography-body-medium text-base leading-7 font-semibold text-[#6b6c7b] md:text-[20px] md:leading-[30px]"
                    >
                        물건을 등록하는 순간부터 AI가 시세를 지켜봐 드려요.
                    </m.p>
                </div>
                <m.div
                    {...textRiseMotion}
                    transition={{ ...textRiseMotion.transition, delay: 0.36 }}
                >
                    <StartButton href={startHref} isInitialized={isInitialized} compact />
                </m.div>
            </div>
        </section>
    );
}
