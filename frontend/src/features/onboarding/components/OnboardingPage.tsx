"use client";

import { domAnimation, LazyMotion, MotionConfig } from "motion/react";
import { ScrollToTopButton } from "@/common/components/layout/ScrollToTopButton";
import { useSmoothScroll } from "@/common/hooks/useSmoothScroll";
import { useAuthStore } from "@/features/auth/store/authStore";
import { HeroSection } from "@/features/onboarding/components/HeroSection";
import { StepsSection } from "@/features/onboarding/components/StepsSection";
import { AnalysisSection } from "@/features/onboarding/components/AnalysisSection";
import { AudienceSection } from "@/features/onboarding/components/AudienceSection";
import { StartSection } from "@/features/onboarding/components/StartSection";

export function OnboardingPage() {
    const isInitialized = useAuthStore((state) => state.isInitialized);
    const handleScrollToTop = useSmoothScroll();
    return (
        <MotionConfig reducedMotion="user">
            <LazyMotion features={domAnimation} strict>
                <main className="overflow-x-clip bg-white">
                    <HeroSection startHref="/home" isInitialized={isInitialized} />
                    <StepsSection />
                    <AnalysisSection />
                    <AudienceSection />
                    <StartSection startHref="/home" isInitialized={isInitialized} />
                    <ScrollToTopButton onClick={handleScrollToTop} />
                </main>
            </LazyMotion>
        </MotionConfig>
    );
}
