"use client";

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
                    <h2 className="typography-heading-01 text-[#363636]">
                        지금, 타이밍을 확인해보세요.
                    </h2>
                    <p className="typography-heading-03 font-semibold text-[#6b6c7b]">
                        물건을 등록하는 순간부터 AI가 시세를 지켜봐 드려요.
                    </p>
                </div>
                <div>
                    <StartButton href={startHref} isInitialized={isInitialized} compact />
                </div>
            </div>
        </section>
    );
}
