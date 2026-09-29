"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, type MouseEvent, type PointerEvent } from "react";
import Lenis from "lenis";
import "lenis/dist/lenis.css";
import {
    ArrowRight,
    ArrowUp,
    ChartNoAxesCombined,
    History,
    Tags,
    TrendingDown,
} from "lucide-react";
import {
    domAnimation,
    LazyMotion,
    MotionConfig,
    useInView,
    useReducedMotion,
    useSpring,
} from "motion/react";
import * as m from "motion/react-m";

import { useAuthStore } from "@/features/auth/store/authStore";
import { Button } from "@/common/components/ui/Button";

const startButtonClassName =
    "group relative h-auto gap-3 overflow-hidden rounded-full px-14 transition-[background-color,translate,scale,box-shadow] duration-300 hover:shadow-[0_12px_32px_rgba(108,83,255,0.3)] focus-visible:shadow-[0_12px_32px_rgba(108,83,255,0.3)] motion-safe:hover:-translate-y-1 motion-safe:active:scale-[0.96] motion-reduce:transition-none";

const sectionBackgroundClassName =
    "bg-[#f7f8fb] bg-[radial-gradient(ellipse_at_85%_20%,#eeebf8_0%,transparent_65%)]";

const cardClassName =
    "overflow-hidden rounded-3xl border border-[#e4e6ee] bg-white shadow-[0_4px_20px_rgba(32,35,50,0.03)] transition-[border-color,box-shadow] duration-300 hover:border-primary/25 hover:shadow-[0_16px_40px_rgba(32,35,50,0.07)] motion-reduce:transition-none";

const headingClassName =
    "typography-heading-01 text-[32px] leading-[1.25] font-bold tracking-[-0.035em] text-[#202332] text-balance md:text-[48px]";

const cardTitleClassName =
    "typography-heading-03 text-2xl leading-8 font-semibold tracking-[-0.02em] text-[#202332] md:text-[28px] md:leading-9";

const descriptionClassName =
    "typography-body-medium text-base leading-7 text-[#667085] md:text-lg md:leading-8";

const revealMotion = {
    initial: { opacity: 0, y: 40 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, amount: 0.15 },
    transition: { duration: 0.65, ease: "easeOut" as const },
};

const textRiseMotion = {
    initial: { y: 32 },
    whileInView: { y: 0 },
    viewport: { once: true, amount: 0.15 },
    transition: { duration: 0.7, ease: "easeOut" as const },
};

const cardMotion = {
    ...revealMotion,
    initial: { opacity: 0, y: 56, scale: 0.94, rotate: -2 },
    whileInView: { opacity: 1, y: 0, scale: 1, rotate: 0 },
    whileHover: {
        y: -10,
        scale: 1.02,
        transition: { type: "spring" as const, stiffness: 280, damping: 18 },
    },
};

const steps = [
    {
        title: "물건 등록",
        description: "팔고 싶은 물건, 사고 싶은 물건을 사진 한 장으로 등록하세요.",
    },
    {
        title: "AI 분석",
        description: "시세 가격 변화·감가상각·거래 데이터를 실시간으로 분석해요.",
    },
    {
        title: "타이밍 알림",
        description: "지금이 팔거나 살 타이밍일 때 바로 알려드려요.",
    },
];

const signals = [
    { title: "중고 시세", icon: Tags, description: "현재 거래되는 평균 가격" },
    {
        title: "가격 변화 추이",
        icon: ChartNoAxesCombined,
        description: "최근 시세가 오르는지 내리는지",
    },
    {
        title: "감가 상각률",
        icon: TrendingDown,
        description: "시간에 따라 가치가 얼마나 줄어드는지",
    },
    { title: "실거래 데이터", icon: History, description: "실제로 오간 거래 기록" },
];

const audiences = [
    {
        title: "판매자라면",
        description:
            "등록한 물건의 시세가 오르면 팔기 좋은 타이밍을, 떨어지고 있다면 조금만 더 기다리라는 신호를 보내드려요.",
    },
    {
        title: "구매자라면",
        description:
            "관심 등록해둔 물건이 저렴해지는 순간을 놓치지 않도록 사기 좋은 타이밍에 알려드려요.",
    },
];

function SectionHeading({ eyebrow, title }: { eyebrow: string; title: string }) {
    return (
        <div className="space-y-4">
            <p className="typography-body-medium text-primary text-sm leading-6 font-semibold md:text-base md:leading-7">
                {eyebrow}
            </p>
            <h2 className={headingClassName}>{title}</h2>
        </div>
    );
}

function NumberBadge({ number, muted = false }: { number: number; muted?: boolean }) {
    return (
        <span
            className={`flex size-10 shrink-0 items-center justify-center rounded-xl text-base font-semibold ${muted ? "text-primary bg-[#efedff]" : "bg-primary text-white"}`}
        >
            {number}
        </span>
    );
}

export default function OnboardingPage() {
    const isLoggedIn = useAuthStore((state) => state.isLoggedIn);
    const isInitialized = useAuthStore((state) => state.isInitialized);
    const shouldReduceMotion = useReducedMotion();
    const heroRef = useRef<HTMLDivElement>(null);
    const isHeroInView = useInView(heroRef, { amount: 0.1 });
    const heroX = useSpring(0, { stiffness: 160, damping: 18 });
    const heroRotateX = useSpring(0, { stiffness: 160, damping: 18 });
    const heroRotateY = useSpring(0, { stiffness: 160, damping: 18 });
    const lenisRef = useRef<Lenis | undefined>(undefined);

    useEffect(() => {
        const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
        let lenis: Lenis | undefined;
        const updateScroll = () => {
            lenis?.destroy();
            lenis = preference.matches
                ? undefined
                : new Lenis({
                      autoRaf: true,
                      lerp: 0.12,
                      smoothWheel: true,
                      syncTouch: false,
                  });
            lenisRef.current = lenis;
        };

        updateScroll();
        preference.addEventListener("change", updateScroll);
        return () => {
            preference.removeEventListener("change", updateScroll);
            lenis?.destroy();
            lenisRef.current = undefined;
        };
    }, []);

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

    const startHref = isLoggedIn ? "/home" : "/login";
    const handleScrollToTop = () => {
        if (lenisRef.current) {
            lenisRef.current.scrollTo(0);
        } else {
            window.scrollTo({ top: 0, behavior: "instant" });
        }
    };
    const handleStartClick = (event: MouseEvent<HTMLAnchorElement>) => {
        if (!isInitialized) event.preventDefault();
    };

    return (
        <MotionConfig reducedMotion="user">
            <LazyMotion features={domAnimation} strict>
                <main className="bg-muted/20">
                    <div className="layout-container space-y-28 pt-16 pb-28 md:space-y-40 md:pt-28 md:pb-40">
                        <section className="relative isolate grid min-h-[630px] items-center gap-10 lg:grid-cols-2">
                            <div
                                aria-hidden="true"
                                className={`${sectionBackgroundClassName} pointer-events-none absolute -top-16 -bottom-14 left-1/2 -z-10 w-screen -translate-x-1/2 md:-top-28 md:-bottom-20`}
                            />
                            <div className="space-y-10">
                                <div className="space-y-4">
                                    <div className="space-y-2.5">
                                        <m.p
                                            {...textRiseMotion}
                                            className="typography-body-medium text-primary text-base leading-7 font-semibold"
                                        >
                                            AI와 함께하는 똑똑한 중고거래
                                        </m.p>
                                        <m.h1
                                            {...textRiseMotion}
                                            transition={{
                                                ...textRiseMotion.transition,
                                                delay: 0.18,
                                            }}
                                            className="typography-heading-01 text-[36px] leading-[1.2] tracking-[-0.035em] text-balance text-[#202332] min-[1400px]:text-[60px] min-[1400px]:whitespace-nowrap md:text-[44px]"
                                        >
                                            지금 팔까, 더 갖고 있을까?
                                        </m.h1>
                                    </div>
                                    <m.p
                                        {...textRiseMotion}
                                        transition={{ ...textRiseMotion.transition, delay: 0.36 }}
                                        className="typography-body-medium max-w-[540px] text-lg leading-8 text-[#667085] md:text-xl md:leading-9"
                                    >
                                        집에 있는 물건과 사고 싶은 물건을 등록해두면, AI가 중고
                                        시세·가격 변화·감가상각·거래 데이터를 분석해 지금이 팔
                                        때인지, 살 때인지 알려드려요.
                                    </m.p>
                                </div>
                                <m.div
                                    {...textRiseMotion}
                                    transition={{ ...textRiseMotion.transition, delay: 0.54 }}
                                >
                                    <Button
                                        asChild
                                        className={`${startButtonClassName} typography-heading-03 min-h-16 text-[length:var(--type-heading-03-size)] leading-[var(--type-heading-03-line-height)] font-semibold`}
                                    >
                                        <Link
                                            href={startHref}
                                            aria-disabled={!isInitialized}
                                            tabIndex={isInitialized ? undefined : -1}
                                            onClick={handleStartClick}
                                        >
                                            <span
                                                aria-hidden="true"
                                                className="pointer-events-none absolute inset-y-0 -left-1/2 w-1/3 -skew-x-12 bg-white/20 opacity-0 motion-safe:transition-[translate,opacity] motion-safe:duration-700 motion-safe:group-hover:translate-x-[500%] motion-safe:group-hover:opacity-100 motion-safe:group-focus-visible:translate-x-[500%] motion-safe:group-focus-visible:opacity-100"
                                            />
                                            시작하기
                                            <ArrowRight
                                                aria-hidden="true"
                                                className="size-5 motion-safe:transition-transform motion-safe:group-hover:translate-x-1"
                                            />
                                        </Link>
                                    </Button>
                                </m.div>
                            </div>
                            <m.div
                                ref={heroRef}
                                initial={{ y: 48, scale: 0.92, rotate: -4, opacity: 0.85 }}
                                animate={{ y: 0, scale: 1, rotate: 0, opacity: 1 }}
                                transition={{ type: "spring", stiffness: 140, damping: 16 }}
                                onPointerMove={handleHeroPointerMove}
                                onPointerLeave={resetHeroPointer}
                                className="relative mx-auto aspect-[583/603] w-full max-w-[583px] overflow-hidden [perspective:1000px] lg:left-20"
                            >
                                <m.div
                                    className="absolute inset-0"
                                    style={
                                        shouldReduceMotion === false
                                            ? {
                                                  x: heroX,
                                                  rotateX: heroRotateX,
                                                  rotateY: heroRotateY,
                                              }
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
                                            repeat:
                                                isHeroInView && shouldReduceMotion === false
                                                    ? Infinity
                                                    : 0,
                                            ease: "easeInOut",
                                        }}
                                    >
                                        <div className="absolute top-[9.95%] right-0 bottom-0 left-[10.29%]">
                                            <Image
                                                src="/onboarding/hero.png"
                                                alt="돋보기로 물건을 살펴보는 AI 캐릭터"
                                                width={1123}
                                                height={842}
                                                priority
                                                unoptimized
                                                className="absolute top-[-14.17%] left-[-37.94%] h-[114.17%] w-[158.09%] max-w-none -scale-x-100"
                                            />
                                        </div>
                                    </m.div>
                                </m.div>
                            </m.div>
                        </section>

                        <section
                            className="space-y-12 md:space-y-20"
                            aria-labelledby="steps-heading"
                        >
                            <m.div id="steps-heading" {...revealMotion}>
                                <SectionHeading
                                    eyebrow="AI와 함께하는 똑똑한 중고거래"
                                    title="이렇게 사용해요"
                                />
                            </m.div>
                            <div className="grid gap-5 lg:grid-cols-3">
                                {steps.map((step, index) => (
                                    <m.article
                                        key={step.title}
                                        {...cardMotion}
                                        transition={{
                                            ...revealMotion.transition,
                                            delay: index * 0.22,
                                        }}
                                        className={cardClassName}
                                    >
                                        <div
                                            className="h-[244px] bg-[#d3d3d3]"
                                            role="img"
                                            aria-label={`${step.title} 이미지 준비 중`}
                                        />
                                        <div className="space-y-5 px-7 py-8">
                                            <div className="flex items-center gap-4">
                                                <NumberBadge number={index + 1} />
                                                <h3 className={cardTitleClassName}>{step.title}</h3>
                                            </div>
                                            <p className={descriptionClassName}>
                                                {step.description}
                                            </p>
                                        </div>
                                    </m.article>
                                ))}
                            </div>
                        </section>

                        <section
                            className="relative isolate space-y-12 py-16 md:space-y-20 md:py-24"
                            aria-labelledby="signals-heading"
                        >
                            <div
                                aria-hidden="true"
                                className={`${sectionBackgroundClassName} pointer-events-none absolute inset-y-0 left-1/2 -z-10 w-screen -translate-x-1/2`}
                            />
                            <m.div id="signals-heading" {...revealMotion}>
                                <SectionHeading
                                    eyebrow="네 가지 데이터를 종합해서 지금이 좋은 타이밍인지 판단해요"
                                    title="AI가 무엇을 분석하나요?"
                                />
                            </m.div>
                            <div className="grid gap-5 md:grid-cols-2 md:gap-[30px]">
                                {signals.map((signal, index) => (
                                    <m.article
                                        key={signal.title}
                                        {...cardMotion}
                                        transition={{
                                            ...revealMotion.transition,
                                            delay: index * 0.08,
                                        }}
                                        className={`${cardClassName} relative flex min-h-[280px] flex-col gap-6 px-8 py-9 md:px-10`}
                                    >
                                        <div
                                            aria-hidden="true"
                                            className="pointer-events-none absolute top-0 right-0 h-40 w-48 bg-[radial-gradient(ellipse_at_top_right,#f0edff_0%,transparent_70%)]"
                                        />
                                        <div className="relative flex items-center justify-between">
                                            <div className="text-primary border-primary/10 flex size-14 items-center justify-center rounded-2xl border bg-[#f5f3ff]">
                                                <signal.icon
                                                    aria-hidden="true"
                                                    className="size-7"
                                                    strokeWidth={1.5}
                                                />
                                            </div>
                                            <NumberBadge number={index + 1} muted />
                                        </div>
                                        <div className="relative space-y-3">
                                            <h3 className={cardTitleClassName}>{signal.title}</h3>
                                            <p className={descriptionClassName}>
                                                {signal.description}
                                            </p>
                                        </div>
                                        <div
                                            aria-hidden="true"
                                            className="bg-primary/35 mt-auto h-1 w-12 rounded-full"
                                        />
                                    </m.article>
                                ))}
                            </div>
                        </section>

                        <section
                            className="space-y-12 md:space-y-20"
                            aria-labelledby="audiences-heading"
                        >
                            <m.div id="audiences-heading" {...revealMotion}>
                                <SectionHeading
                                    eyebrow="당신만을 위한 맞춤형 중고거래 도우미"
                                    title="파는 사람에게도, 사는 사람에게도"
                                />
                            </m.div>
                            <div className="grid gap-5 md:grid-cols-2">
                                {audiences.map((audience, index) => (
                                    <m.article
                                        key={audience.title}
                                        {...cardMotion}
                                        transition={{
                                            ...revealMotion.transition,
                                            delay: index * 0.1,
                                        }}
                                        className={cardClassName}
                                    >
                                        <div
                                            className="h-[244px] bg-[#d3d3d3]"
                                            role="img"
                                            aria-label={`${audience.title} 이미지 준비 중`}
                                        />
                                        <div className="space-y-4 px-8 py-8 md:px-10">
                                            <h3 className={cardTitleClassName}>{audience.title}</h3>
                                            <p className={descriptionClassName}>
                                                {audience.description}
                                            </p>
                                        </div>
                                    </m.article>
                                ))}
                            </div>
                        </section>
                    </div>

                    <m.section
                        {...revealMotion}
                        className={`${sectionBackgroundClassName} relative isolate overflow-hidden py-20 md:py-24`}
                    >
                        <div className="layout-container relative space-y-10 text-center">
                            <div className="space-y-7">
                                <div className="space-y-2.5">
                                    <m.h2 {...textRiseMotion} className={headingClassName}>
                                        지금, 타이밍을 확인해보세요.
                                    </m.h2>
                                    <m.p
                                        {...textRiseMotion}
                                        transition={{ ...textRiseMotion.transition, delay: 0.18 }}
                                        className={descriptionClassName}
                                    >
                                        물건을 등록하는 순간부터 AI가 시세를 지켜봐 드려요.
                                    </m.p>
                                </div>
                                <m.div
                                    {...textRiseMotion}
                                    transition={{ ...textRiseMotion.transition, delay: 0.36 }}
                                >
                                    <Button
                                        asChild
                                        className={`${startButtonClassName} typography-body-medium min-h-[54px] text-[length:var(--type-body-medium-size)] leading-[var(--type-body-medium-line-height)] font-semibold`}
                                    >
                                        <Link
                                            href={startHref}
                                            aria-disabled={!isInitialized}
                                            tabIndex={isInitialized ? undefined : -1}
                                            onClick={handleStartClick}
                                            aria-label="지금 시작하기"
                                        >
                                            <span
                                                aria-hidden="true"
                                                className="pointer-events-none absolute inset-y-0 -left-1/2 w-1/3 -skew-x-12 bg-white/20 opacity-0 motion-safe:transition-[translate,opacity] motion-safe:duration-700 motion-safe:group-hover:translate-x-[500%] motion-safe:group-hover:opacity-100 motion-safe:group-focus-visible:translate-x-[500%] motion-safe:group-focus-visible:opacity-100"
                                            />
                                            시작하기
                                            <ArrowRight
                                                aria-hidden="true"
                                                className="size-5 motion-safe:transition-transform motion-safe:group-hover:translate-x-1"
                                            />
                                        </Link>
                                    </Button>
                                </m.div>
                            </div>
                            <div className="grid gap-6 md:grid-cols-3" aria-hidden="true">
                                <div className="h-[188px] rounded-3xl bg-[#fafbff]" />
                                <div className="h-[188px] rounded-3xl bg-[#fafbff]" />
                                <div className="h-[188px] rounded-3xl bg-[#fafbff]" />
                            </div>
                        </div>
                    </m.section>
                    <Button
                        type="button"
                        size="icon-lg"
                        aria-label="맨 위로 이동"
                        title="맨 위로 이동"
                        onClick={handleScrollToTop}
                        className="group fixed right-8 bottom-[calc(2rem+env(safe-area-inset-bottom))] z-40 size-15 overflow-hidden rounded-full shadow-lg transition-[background-color,translate,scale,box-shadow] duration-300 hover:shadow-[0_0_24px_rgba(108,83,255,0.55)] focus-visible:shadow-[0_0_24px_rgba(108,83,255,0.55)] motion-safe:hover:-translate-y-1 motion-safe:active:scale-95 motion-reduce:transition-none md:right-12 md:bottom-[calc(3rem+env(safe-area-inset-bottom))]"
                    >
                        <span
                            aria-hidden="true"
                            className="pointer-events-none absolute inset-y-0 -left-1/2 w-1/3 -skew-x-12 bg-white/30 opacity-0 motion-safe:transition-[translate,opacity] motion-safe:duration-700 motion-safe:group-hover:translate-x-[500%] motion-safe:group-hover:opacity-100 motion-safe:group-focus-visible:translate-x-[500%] motion-safe:group-focus-visible:opacity-100"
                        />
                        <ArrowUp
                            aria-hidden="true"
                            className="size-6 motion-safe:transition-transform motion-safe:group-hover:-translate-y-0.5"
                        />
                    </Button>
                </main>
            </LazyMotion>
        </MotionConfig>
    );
}
