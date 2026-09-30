"use client";

import { ArrowUp } from "lucide-react";
import { domAnimation, LazyMotion, MotionConfig } from "motion/react";
import { Button } from "@/common/components/ui/Button";
import { useAuthStore } from "@/features/auth/store/authStore";
import { useOnboardingScroll } from "@/features/onboarding/hooks/useOnboardingScroll";
import { HeroSection } from "@/features/onboarding/components/HeroSection";
import { StepsSection } from "@/features/onboarding/components/StepsSection";
import { AnalysisSection } from "@/features/onboarding/components/AnalysisSection";
import { AudienceSection } from "@/features/onboarding/components/AudienceSection";
import { StartSection } from "@/features/onboarding/components/StartSection";

export function OnboardingPage() {
    const isLoggedIn = useAuthStore((state) => state.isLoggedIn);
    const isInitialized = useAuthStore((state) => state.isInitialized);
    const startHref = isLoggedIn ? "/home" : "/login";
    const handleScrollToTop = useOnboardingScroll();
    return (
        <MotionConfig reducedMotion="user">
            <LazyMotion features={domAnimation} strict>
                <main className="bg-white">
                    <HeroSection startHref={startHref} isInitialized={isInitialized} />
                    <StepsSection />
                    <AnalysisSection />
                    <AudienceSection />
                    <StartSection startHref={startHref} isInitialized={isInitialized} />
                    <Button
                        type="button"
                        size="icon-lg"
                        aria-label="맨 위로 이동"
                        title="맨 위로 이동"
                        onClick={handleScrollToTop}
                        className="fixed right-8 bottom-[calc(2rem+env(safe-area-inset-bottom))] z-40 size-[70px] rounded-full bg-[#6653fb] p-0 text-white hover:bg-[#6653fb] focus-visible:ring-3 focus-visible:ring-[#6653fb]/30 md:right-12 md:bottom-[calc(3rem+env(safe-area-inset-bottom))]"
                    >
                        <ArrowUp
                            aria-hidden="true"
                            strokeWidth={2.5}
                            className="absolute top-2 left-1/2 size-8 -translate-x-1/2"
                        />
                        <span className="absolute top-[43px] left-0 w-full text-center text-[11px] leading-none font-medium">
                            바로가기
                        </span>
                    </Button>
                </main>
            </LazyMotion>
        </MotionConfig>
    );
}
