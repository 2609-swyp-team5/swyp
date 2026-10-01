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
    const isLoggedIn = useAuthStore((state) => state.isLoggedIn);
    const isInitialized = useAuthStore((state) => state.isInitialized);
    const startHref = isLoggedIn ? "/home" : "/login";
    const handleScrollToTop = useSmoothScroll();
    return (
        <MotionConfig reducedMotion="user">
            <LazyMotion features={domAnimation} strict>
                <main className="bg-white">
                    <HeroSection startHref={startHref} isInitialized={isInitialized} />
                    <StepsSection />
                    <AnalysisSection />
                    <AudienceSection />
                    <StartSection startHref={startHref} isInitialized={isInitialized} />
                    <ScrollToTopButton onClick={handleScrollToTop} />
                </main>
            </LazyMotion>
        </MotionConfig>
    );
}
