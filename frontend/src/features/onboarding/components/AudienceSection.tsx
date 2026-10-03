"use client";

import Image from "next/image";
import * as m from "motion/react-m";
import { cardMotion } from "@/features/onboarding/onboardingMotion";
import { SectionHeading } from "@/features/onboarding/components/shared/SectionHeading";

const audiences = [
    {
        title: "판매자라면",
        description:
            "등록한 물건의 시세가 오르면 팔기 좋은 타이밍을, 떨어지고 있다면 조금만 더 기다리라는 신호를 보내드려요.",
        signal: "SELL",
        image: "sell-recommendation.png",
        recommendation: "지금 판매 추천!",
        firstLine: "시세가 고점에 도달했어요.",
        secondLine: "지금이 가장 비싸게 팔 수 있는 기회입니다.",
    },
    {
        title: "구매자라면",
        description:
            "관심 등록해둔 물건이 저렴해지는 순간을 놓치지 않도록 사기 좋은 타이밍에 알려드려요.",
        signal: "WAIT",
        image: "wait-recommendation.png",
        recommendation: "조금만 더 기다려요!",
        firstLine: "가격이 점차 하락하는 추세입니다.",
        secondLine: "1주일 뒤 더 저렴하게 살 수 있어요.",
    },
];

export function AudienceSection() {
    return (
        <section
            className="layout-container space-y-12 py-20 md:space-y-20 md:py-[160px]"
            aria-labelledby="audiences-heading"
        >
            <SectionHeading
                id="audiences-heading"
                eyebrow="네 가지 데이터를 종합해서 지금이 좋은 타이밍인지 판단해요"
                title="파는 사람에게도, 사는 사람에게도"
            />
            <div className="grid gap-[30px] md:grid-cols-2">
                {audiences.map((audience, index) => (
                    <m.article
                        key={audience.title}
                        {...cardMotion}
                        initial={{
                            opacity: 0,
                            x: index === 0 ? "-12%" : "12%",
                            y: 32,
                            scale: 0.9,
                            rotate: index === 0 ? -5 : 5,
                        }}
                        whileInView={{ opacity: 1, x: 0, y: 0, scale: 1, rotate: 0 }}
                        transition={{ type: "spring", duration: 1.1, bounce: 0.25 }}
                        className="hover:border-primary/25 min-w-0 overflow-hidden rounded-[10px] border border-[#d3d3d3] bg-white transition-[border-color,box-shadow] duration-300 hover:shadow-[0_16px_40px_rgba(32,35,50,0.07)] motion-reduce:transition-none"
                    >
                        <div className="flex h-[280px] items-center justify-center bg-[#f0f0f5] p-5 lg:p-10">
                            <Image
                                src={`/onboarding/${audience.image}`}
                                alt={`${audience.signal}: ${audience.recommendation} ${audience.firstLine} ${audience.secondLine}`}
                                width={688}
                                height={460}
                                unoptimized
                                className="h-auto w-[344px] max-w-full"
                            />
                        </div>
                        <div className="space-y-5 p-6 lg:p-10">
                            <h3 className="typography-heading-03 font-bold text-[#363636]">
                                {audience.title}
                            </h3>
                            <p className="typography-body-medium font-medium text-[#363636]">
                                {audience.description}
                            </p>
                        </div>
                    </m.article>
                ))}
            </div>
        </section>
    );
}
