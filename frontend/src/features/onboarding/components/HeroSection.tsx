"use client";

import Image from "next/image";
import { useRef, type PointerEvent } from "react";
import { useInView, useReducedMotion, useSpring } from "motion/react";
import * as m from "motion/react-m";
import { revealMotion } from "@/features/onboarding/onboardingMotion";
import { OnboardingBackground } from "@/features/onboarding/components/shared/OnboardingBackground";
import { StartButton } from "@/features/onboarding/components/shared/StartButton";
import styles from "@/features/onboarding/onboarding.module.css";

export function HeroSection({
    startHref,
    isInitialized,
}: {
    startHref: string;
    isInitialized: boolean;
}) {
    const shouldReduceMotion = useReducedMotion();
    const heroRef = useRef<HTMLDivElement>(null);
    const isHeroInView = useInView(heroRef, { amount: 0.1 });
    const heroX = useSpring(0, { stiffness: 160, damping: 18 });
    const heroRotateX = useSpring(0, { stiffness: 160, damping: 18 });
    const heroRotateY = useSpring(0, { stiffness: 160, damping: 18 });
    const handleHeroPointerMove = (event: PointerEvent<HTMLDivElement>) => {
        if (shouldReduceMotion !== false || event.pointerType !== "mouse") return;
        const bounds = event.currentTarget.getBoundingClientRect();
        const x = ((event.clientX - bounds.left) / bounds.width - 0.5) * 2;
        const y = ((event.clientY - bounds.top) / bounds.height - 0.5) * 2;
        heroX.set(x * 32);
        heroRotateY.set(x * 14);
        heroRotateX.set(y * -10);
    };
    const resetHeroPointer = () => {
        heroX.set(0);
        heroRotateX.set(0);
        heroRotateY.set(0);
    };

    return (
        <section className="relative isolate overflow-hidden">
            <OnboardingBackground />
            <div className="layout-container relative grid min-h-[calc(100svh-var(--header-height))] gap-10 pt-24 pb-16 lg:block lg:min-h-[max(742px,calc(100svh-var(--header-height)))] lg:py-0">
                <div className="relative z-10 space-y-10 lg:w-[665px] lg:max-w-[60%] lg:pt-[267px]">
                    <m.div {...revealMotion} className={`${styles.riseText} space-y-4`}>
                        <div className="space-y-2.5">
                            <p className="typography-body-medium text-base leading-7 font-semibold text-[#6b6c7b] md:text-[20px] md:leading-[30px]">
                                AI와 함께하는 똑똑한 중고거래
                            </p>
                            <h1 className="typography-heading-01 text-[36px] leading-[1.25] break-keep text-[#363636] min-[1400px]:whitespace-nowrap md:text-[44px] lg:text-[60px] lg:leading-[75px]">
                                지금 팔까, 더 갖고 있을까?
                            </h1>
                        </div>
                        <p className="max-w-[612px] text-[16px] leading-[25px] font-normal tracking-normal text-[#464646]">
                            <span className="lg:block">
                                집에 있는 물건과 사고 싶은 물건을 등록해두면,{" "}
                            </span>
                            <span className="lg:block">
                                AI가 중고 시세·가격 변화·감가상각·거래 데이터를 분석해{" "}
                            </span>
                            <span className="lg:block">
                                지금이 팔 때인지, 살 때인지 알려드려요.
                            </span>
                        </p>
                    </m.div>
                    <m.div
                        {...revealMotion}
                        transition={{ ...revealMotion.transition, delay: 0.2 }}
                        className={styles.riseText}
                    >
                        <StartButton href={startHref} isInitialized={isInitialized} />
                    </m.div>
                </div>
                <m.div
                    ref={heroRef}
                    initial={{ y: 48, scale: 0.92, rotate: -4, opacity: 0.85 }}
                    animate={{ y: 0, scale: 1, rotate: 0, opacity: 1 }}
                    transition={{ type: "spring", stiffness: 140, damping: 16 }}
                    onPointerMove={handleHeroPointerMove}
                    onPointerLeave={resetHeroPointer}
                    className="relative mx-auto aspect-[563/539] w-full max-w-[563px] [perspective:1000px] lg:absolute lg:top-[184px] lg:-right-10 lg:w-[46.3%]"
                >
                    <m.div
                        className="absolute inset-0"
                        style={
                            shouldReduceMotion === false
                                ? { x: heroX, rotateX: heroRotateX, rotateY: heroRotateY }
                                : { transform: "none" }
                        }
                    >
                        <m.div
                            className="absolute inset-0"
                            initial={false}
                            animate={
                                isHeroInView && shouldReduceMotion === false
                                    ? {
                                          x: [0, 14, 0, -12, 0],
                                          y: [0, -28, -8, -22, 0],
                                          rotate: [0, -4, 1, 3, 0],
                                          scale: [1, 1.035, 1, 1.02, 1],
                                      }
                                    : { x: 0, y: 0, rotate: 0, scale: 1 }
                            }
                            transition={{
                                duration: 4.8,
                                repeat: isHeroInView && shouldReduceMotion === false ? Infinity : 0,
                                ease: "easeInOut",
                            }}
                        >
                            <div className="absolute inset-0">
                                <Image
                                    src="/onboarding/hero.png"
                                    alt="돋보기로 물건을 살펴보는 AI 캐릭터"
                                    width={1254}
                                    height={1254}
                                    priority
                                    unoptimized
                                    className="absolute top-[4.267%] left-[1.954%] h-[95.733%] w-[91.652%] max-w-none -scale-x-100"
                                />
                                <div className="absolute top-0 left-0 w-[33.57%]">
                                    <Image
                                        src="/onboarding/speech-wait.svg"
                                        alt=""
                                        width={189}
                                        height={98.3192}
                                        className="h-auto -scale-x-100"
                                    />
                                    <span className="absolute top-[25.75%] left-0 w-full text-center text-[clamp(12px,3.5vw,20px)] leading-[1.6] font-medium tracking-normal text-black">
                                        더 갖고 있을까?
                                    </span>
                                </div>
                                <div className="absolute top-[14.286%] right-0 w-[25.044%]">
                                    <Image
                                        src="/onboarding/speech-sell.svg"
                                        alt=""
                                        width={141}
                                        height={90}
                                        className="h-auto"
                                    />
                                    <span className="absolute top-[24.444%] left-0 w-full text-center text-[clamp(12px,3.5vw,20px)] leading-[1.6] font-medium tracking-normal text-black">
                                        지금 팔까?
                                    </span>
                                </div>
                            </div>
                        </m.div>
                    </m.div>
                </m.div>
            </div>
        </section>
    );
}
