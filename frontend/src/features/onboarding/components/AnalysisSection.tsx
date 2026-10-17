"use client";

import Image from "next/image";
import { cn } from "@/common/lib/utils";
import * as m from "motion/react-m";
import { cardMotion, revealMotion } from "@/features/onboarding/onboardingMotion";
import { SectionHeading } from "@/features/onboarding/components/shared/SectionHeading";

const signals = [
    {
        title: "중고 시세",
        description: "현재 거래되는 평균 가격 범위",
        image: "market-price.png",
        width: 1066,
        height: 640,
        alt: "거래 가격 분포와 최저가·평균 거래가·예상 가격·최고가",
    },
    {
        title: "가격 변화 추이",
        description: "최근 시세가 오르는지 내리는지",
        image: "price-trend.png",
        width: 1074,
        height: 579,
        alt: "최근 12개월의 월 평균 거래가 변화 추이",
    },
    {
        title: "감가 상각률",
        description: "시간에 따라 가치가 얼마나 줄어드는지",
        image: "depreciation.png",
        width: 1066,
        height: 640,
        alt: "구매 시점부터 현재와 향후 예상까지의 구매가 대비 가치",
    },
];

export function AnalysisSection() {
    return (
        <section
            className="relative isolate bg-[radial-gradient(ellipse_1162px_644px_at_50%_50%,#b9aefc,transparent)] py-10 md:py-20"
            aria-labelledby="signals-heading"
        >
            {/* Figma 1854-13457: 2열 그리드 — 왼쪽 위 칸에 제목·캐릭터, 나머지 세 칸에 분석 카드 */}
            <div className="layout-container relative grid gap-x-[30px] gap-y-5 md:grid-cols-2">
                <div className="flex min-w-0 flex-col items-center justify-end gap-2.5 self-start md:px-[30px]">
                    <div className="w-full">
                        <SectionHeading
                            id="signals-heading"
                            eyebrow="네 가지 데이터를 종합해서 지금이 좋은 타이밍인지 판단해요"
                            // Figma 40/50px — 절반 칸이라 좁은 화면에선 줄인다
                            titleClassName="typography-heading-01"
                            title={
                                <>
                                    <span className="break-keep xl:whitespace-nowrap">
                                        시세부터 실거래까지,
                                    </span>
                                    <br />
                                    <span className="break-keep xl:whitespace-nowrap">
                                        타이밍의 근거를 확인하세요
                                    </span>
                                </>
                            }
                        />
                    </div>
                    <div className="relative aspect-[383/360] w-[240px] overflow-hidden md:w-full md:max-w-[383px]">
                        <Image
                            src="/onboarding/analysis-character.png"
                            alt="분석 그래프를 살펴보는 AI 캐릭터"
                            width={1536}
                            height={1024}
                            className="absolute top-0 -left-[14.64%] h-full w-[141.21%] max-w-none"
                        />
                    </div>
                </div>
                {signals.map((signal, index) => (
                    <m.article
                        key={signal.title}
                        {...cardMotion}
                        transition={{ ...revealMotion.transition, delay: index * 0.08 }}
                        // Figma: 카드 높이 462px 고정(제목 칸에 맞춰 늘어나지 않게 self-start), 중고 시세만 그래프가 설명 바로 아래
                        className={cn(
                            "hover:border-primary/25 flex min-w-0 flex-col gap-2.5 rounded-[30px] border border-[#d3d3d3] bg-white p-5 transition-[border-color,box-shadow] duration-300 hover:shadow-[0_16px_40px_rgba(32,35,50,0.07)] motion-reduce:transition-none md:h-[462px] md:self-start md:p-[30px]",
                            index === 0 ? "justify-start" : "justify-between",
                        )}
                    >
                        <div className={index === 1 ? "space-y-[5px]" : "space-y-2.5"}>
                            <div
                                className={`flex items-center ${index === 1 ? "gap-2.5" : "gap-[15px]"}`}
                            >
                                <span className="typography-body-bold flex size-8 shrink-0 items-center justify-center rounded-full bg-[#6653fb] font-bold text-white">
                                    {index + 1}
                                </span>
                                <h3 className="typography-heading-02 font-bold text-[#363636]">
                                    {signal.title}
                                </h3>
                            </div>
                            <p className="typography-body-medium font-normal text-[#6b6c7b]">
                                {signal.description}
                            </p>
                        </div>
                        <div
                            className={cn(
                                "flex min-w-0 md:h-[320px]",
                                index === 0 ? "items-start" : "items-center",
                            )}
                        >
                            <Image
                                src={`/onboarding/${signal.image}`}
                                alt={signal.alt}
                                width={signal.width}
                                height={signal.height}
                                className="h-auto w-full"
                            />
                        </div>
                    </m.article>
                ))}
            </div>
        </section>
    );
}
