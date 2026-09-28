"use client";

import Image from "next/image";
import Link from "next/link";
import type { MouseEvent } from "react";

import { useAuthStore } from "@/features/auth/store/authStore";

const steps = [
    {
        title: "물건 등록",
        description: "팔고 싶은 물건, 사고 싶은 물건을 사진 한 장으로 등록하세요.",
    },
    { title: "AI 분석", description: "시세 가격 변화·감가상각·거래 데이터를 실시간으로 분석해요." },
    { title: "타이밍 알림", description: "지금이 팔거나 살 타이밍일 때 바로 알려드려요." },
];

const signals = [
    { title: "중고 시세", description: "현재 거래되는 평균 가격" },
    { title: "가격 변화 추이", description: "최근 시세가 오르는지 내리는지" },
    { title: "감가 상각률", description: "시간에 따라 가치가 얼마나 줄어드는지" },
    { title: "실거래 데이터", description: "실제로 오간 거래 기록" },
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
        <div className="space-y-2.5">
            <p className="typography-body-medium text-muted-foreground font-semibold">{eyebrow}</p>
            <h2 className="typography-heading-01 text-[56px] text-[#363636] max-md:text-[40px] max-md:leading-[1.25]">
                {title}
            </h2>
        </div>
    );
}

function NumberBadge({ number, muted = false }: { number: number; muted?: boolean }) {
    return (
        <span
            className={`flex size-10 shrink-0 items-center justify-center rounded-full text-xl font-bold text-white ${muted ? "bg-[#272727]" : "bg-primary"}`}
        >
            {number}
        </span>
    );
}

export default function OnboardingPage() {
    const isLoggedIn = useAuthStore((state) => state.isLoggedIn);
    const isInitialized = useAuthStore((state) => state.isInitialized);

    const startHref = isLoggedIn ? "/home" : "/login";
    const handleStartClick = (event: MouseEvent<HTMLAnchorElement>) => {
        if (!isInitialized) event.preventDefault();
    };

    return (
        <>
            <main className="bg-white">
                <div className="layout-container space-y-28 pt-16 pb-28 md:space-y-40 md:pt-28 md:pb-40">
                    <section className="grid min-h-[630px] items-center gap-10 lg:grid-cols-2">
                        <div className="space-y-10">
                            <div className="space-y-4">
                                <div className="space-y-2.5">
                                    <p className="typography-body-medium text-muted-foreground font-semibold">
                                        AI와 함께하는 똑똑한 중고거래
                                    </p>
                                    <h1 className="typography-heading-01 text-[#363636] max-[1399px]:text-[40px] max-[1399px]:leading-[1.25] min-[1400px]:whitespace-nowrap">
                                        지금 팔까, 더 갖고 있을까?
                                    </h1>
                                </div>
                                <p className="typography-body-medium max-w-[612px] text-[#464646]">
                                    집에 있는 물건과 사고 싶은 물건을 등록해두면, AI가 중고
                                    시세·가격 변화·감가상각·거래 데이터를 분석해 지금이 팔 때인지,
                                    살 때인지 알려드려요.
                                </p>
                            </div>
                            <Link
                                href={startHref}
                                aria-disabled={!isInitialized}
                                tabIndex={isInitialized ? undefined : -1}
                                onClick={handleStartClick}
                                className="typography-heading-03 bg-primary text-primary-foreground hover:bg-primary/80 inline-flex min-h-16 items-center justify-center rounded-full px-14 transition-colors"
                            >
                                시작하기
                            </Link>
                        </div>
                        <div className="relative mx-auto aspect-[583/603] w-full max-w-[583px] overflow-hidden">
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
                        </div>
                    </section>

                    <section className="space-y-12 md:space-y-20" aria-labelledby="steps-heading">
                        <div id="steps-heading">
                            <SectionHeading
                                eyebrow="AI와 함께하는 똑똑한 중고거래"
                                title="이렇게 사용해요"
                            />
                        </div>
                        <div className="grid gap-5 lg:grid-cols-3">
                            {steps.map((step, index) => (
                                <article
                                    key={step.title}
                                    className="overflow-hidden rounded-[10px] border border-[#272727]"
                                >
                                    <div
                                        className="h-[244px] bg-[#d3d3d3] motion-safe:animate-pulse"
                                        role="img"
                                        aria-label={`${step.title} 이미지 준비 중`}
                                    />
                                    <div className="space-y-5 px-7 py-8">
                                        <div className="flex items-center gap-4">
                                            <NumberBadge number={index + 1} />
                                            <h3 className="typography-heading-03 text-primary max-md:text-2xl max-md:leading-8">
                                                {step.title}
                                            </h3>
                                        </div>
                                        <p className="typography-body-medium text-[#363636]">
                                            {step.description}
                                        </p>
                                    </div>
                                </article>
                            ))}
                        </div>
                    </section>

                    <section className="space-y-12 md:space-y-20" aria-labelledby="signals-heading">
                        <div id="signals-heading">
                            <SectionHeading
                                eyebrow="네 가지 데이터를 종합해서 지금이 좋은 타이밍인지 판단해요"
                                title="AI가 무엇을 분석하나요?"
                            />
                        </div>
                        <div className="grid gap-5 md:grid-cols-2 md:gap-[30px]">
                            {signals.map((signal, index) => (
                                <article
                                    key={signal.title}
                                    className="flex min-h-[300px] flex-col justify-center gap-2.5 rounded-[10px] border border-[#272727] px-8 py-10 md:px-12"
                                >
                                    <div className="flex items-center gap-5">
                                        <NumberBadge number={index + 1} muted />
                                        <h3 className="typography-heading-03 text-[#363636] max-md:text-2xl max-md:leading-8">
                                            {signal.title}
                                        </h3>
                                    </div>
                                    <p className="typography-body-medium text-[#363636]">
                                        {signal.description}
                                    </p>
                                </article>
                            ))}
                        </div>
                    </section>

                    <section
                        className="space-y-12 md:space-y-20"
                        aria-labelledby="audiences-heading"
                    >
                        <div id="audiences-heading">
                            <SectionHeading
                                eyebrow="당신만을 위한 맞춤형 중고거래 도우미"
                                title="파는 사람에게도, 사는 사람에게도"
                            />
                        </div>
                        <div className="grid gap-5 md:grid-cols-2">
                            {audiences.map((audience) => (
                                <article
                                    key={audience.title}
                                    className="overflow-hidden rounded-[10px] border border-[#272727]"
                                >
                                    <div
                                        className="h-[244px] bg-[#d3d3d3] motion-safe:animate-pulse"
                                        role="img"
                                        aria-label={`${audience.title} 이미지 준비 중`}
                                    />
                                    <div className="space-y-4 px-8 py-8 md:px-10">
                                        <h3 className="typography-heading-03 text-[#363636] max-md:text-2xl max-md:leading-8">
                                            {audience.title}
                                        </h3>
                                        <p className="typography-body-medium text-[#363636]">
                                            {audience.description}
                                        </p>
                                    </div>
                                </article>
                            ))}
                        </div>
                    </section>
                </div>

                <section className="bg-[#dfdfdf] py-20 md:py-24">
                    <div className="layout-container space-y-10 text-center">
                        <div className="space-y-7">
                            <div className="space-y-2.5">
                                <h2 className="typography-heading-01 text-[56px] text-[#363636] max-md:text-[40px] max-md:leading-[1.25]">
                                    지금, 타이밍을 확인해보세요.
                                </h2>
                                <p className="typography-body-medium text-muted-foreground font-semibold">
                                    물건을 등록하는 순간부터 AI가 시세를 지켜봐 드려요.
                                </p>
                            </div>
                            <Link
                                href={startHref}
                                aria-disabled={!isInitialized}
                                tabIndex={isInitialized ? undefined : -1}
                                onClick={handleStartClick}
                                aria-label="지금 시작하기"
                                className="typography-body-medium bg-primary text-primary-foreground hover:bg-primary/80 inline-flex min-h-[54px] items-center justify-center rounded-full px-14 font-semibold transition-colors"
                            >
                                시작하기
                            </Link>
                        </div>
                        <div className="grid gap-6 md:grid-cols-3" aria-hidden="true">
                            <div className="h-[188px] rounded-3xl bg-[#fafbff]" />
                            <div className="h-[188px] rounded-3xl bg-[#fafbff]" />
                            <div className="h-[188px] rounded-3xl bg-[#fafbff]" />
                        </div>
                    </div>
                </section>
            </main>
        </>
    );
}
