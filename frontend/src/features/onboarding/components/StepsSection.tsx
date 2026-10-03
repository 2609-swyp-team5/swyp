"use client";

import Image from "next/image";
import * as m from "motion/react-m";
import { cardMotion, revealMotion } from "@/features/onboarding/onboardingMotion";
import { SectionHeading } from "@/features/onboarding/components/shared/SectionHeading";
import styles from "@/features/onboarding/onboarding.module.css";

const steps = [
    {
        title: "물건 등록",
        description: "팔고 싶은 물건, 사고 싶은 물건을 사진 한 장으로 등록하세요.",
        image: "register.png",
        width: 412,
        height: 332,
    },
    {
        title: "AI 분석",
        description: "시세 가격 변화·감가상각·거래 데이터를 실시간으로 분석해요.",
        image: "analysis.png",
        width: 492,
        height: 372,
    },
    {
        title: "타이밍 알림",
        description: "지금이 팔거나 살 타이밍일 때 바로 알려드려요.",
        image: "timing.png",
        width: 492,
        height: 340,
    },
];
export function StepsSection() {
    return (
        <section
            className="layout-container space-y-12 pt-12 pb-20 md:space-y-20 md:pt-20 md:pb-[160px]"
            aria-labelledby="steps-heading"
        >
            <SectionHeading
                id="steps-heading"
                eyebrow="AI와 함께하는 똑똑한 중고거래"
                title="이렇게 사용해요"
            />
            <div className="grid gap-8 lg:grid-cols-3 lg:gap-[30px]">
                {steps.map((step, index) => (
                    <m.article
                        key={step.title}
                        {...cardMotion}
                        whileHover={undefined}
                        transition={{ ...revealMotion.transition, delay: index * 0.22 }}
                        tabIndex={0}
                        className={`${styles.stepCard} hover:border-primary/25 overflow-hidden border border-[#d3d3d3] bg-white transition-[border-color,box-shadow] duration-300 hover:shadow-[0_16px_40px_rgba(32,35,50,0.07)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#6653fb] motion-reduce:transition-none ${index === 2 ? "rounded-[20px]" : "rounded-[10px]"}`}
                    >
                        <div
                            className="flex h-[244px] items-center justify-center overflow-hidden bg-[#f0f0f5] p-5"
                            aria-hidden="true"
                        >
                            <Image
                                src={`/onboarding/${step.image}`}
                                alt=""
                                width={step.width}
                                height={step.height}
                                unoptimized
                                className={`${styles.stepImage} h-auto max-w-full`}
                                style={{ width: step.width / 2 }}
                            />
                        </div>
                        <div className="space-y-5 p-[30px]">
                            <div className="flex items-center gap-[15px]">
                                <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#6653fb] text-[24px] leading-9 font-bold text-white">
                                    {index + 1}
                                </span>
                                <h3 className="typography-heading-03 leading-[45px] font-bold text-[#6653fb]">
                                    {step.title}
                                </h3>
                            </div>
                            <p
                                className={`${styles.stepDescription} typography-body-medium font-medium text-[#363636]`}
                            >
                                {step.description}
                            </p>
                        </div>
                    </m.article>
                ))}
            </div>
        </section>
    );
}
