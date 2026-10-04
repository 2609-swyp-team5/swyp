"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { ArrowRight, Sparkles } from "lucide-react";

import { Button } from "@/common/components/ui/Button";
import type { ProductResponse } from "@/features/sell/types";
import { priceFormatter } from "@/features/sell/components/manage/productReviewUtils";

const recommendationLabels: Record<string, string> = {
    SELL: "지금 판매 추천",
    HOLD: "판매 보류 추천",
    BUY: "지금 구매 추천",
    WAIT: "구매 보류 추천",
};

export function PriceAnalysis({ product }: { product: ProductResponse }) {
    const router = useRouter();
    const suggestedPrice = product.suggestedPrice;
    const recommendation = product.recommendation;
    const recommendationValue = recommendation ?? "—";
    const recommendationLabel = recommendation
        ? (recommendationLabels[recommendation] ?? recommendation)
        : "분석 결과 준비 중";
    const analysisDescription = product.analysisDescription ?? "분석 결과가 없습니다.";

    return (
        <section
            aria-labelledby="price-analysis-title"
            className="rounded-none bg-[#fafbff] p-5 md:p-7 lg:p-[30px]"
        >
            <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <span className="flex size-12 items-center justify-center rounded-xl bg-gradient-to-b from-[#6653fb] to-[#b1a9ef] text-white">
                        <Sparkles aria-hidden="true" className="size-6" />
                    </span>
                    <h2
                        id="price-analysis-title"
                        className="text-[28px] leading-[42px] font-bold tracking-[0.5px] text-[#6653fb] md:text-[30px]"
                    >
                        AI 가격 분석
                    </h2>
                </div>
                <Button
                    type="button"
                    variant="outline"
                    onClick={() => router.push(`/sell/manage?selected=${product.id}`)}
                    className="h-auto rounded-full border-[#6653fb] bg-white px-5 py-1 text-[16px] leading-[25px] font-semibold tracking-[0.5px] text-[#6653fb] hover:bg-[#f5f3ff] hover:text-[#5745e7]"
                >
                    가격 분석 자세히 보기
                    <ArrowRight aria-hidden="true" className="size-4" />
                </Button>
            </div>

            <div className="mt-7 grid gap-6 lg:grid-cols-[minmax(0,1fr)_520px] lg:items-center">
                <div className="flex min-w-0 items-end gap-7 px-2.5">
                    <Image
                        src="/sell/price-analysis-chart.svg"
                        alt=""
                        width={142}
                        height={126}
                        className="h-[126px] w-[142px] shrink-0"
                    />
                    <div className="min-w-0">
                        <p className="text-[20px] leading-[30px] font-semibold tracking-[0.5px] text-black">
                            AI 추천가
                        </p>
                        <p className="mt-1 text-[30px] leading-[42px] font-bold text-[#6653fb]">
                            {suggestedPrice === null
                                ? "분석 결과 준비 중"
                                : `${priceFormatter.format(suggestedPrice)}원`}
                        </p>
                        <p className="mt-2 text-[12px] leading-5 font-normal tracking-[-0.5px] text-[#83889e]">
                            AI가 분석한 적정 판매 가격이에요.
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                    <div className="flex min-h-[166px] flex-col gap-[30px] rounded-[10px] border border-[#d3d3d3] bg-white p-5">
                        <div className="flex flex-col items-start gap-2.5">
                            <Image src="/sell/timing.svg" alt="" width={32} height={32} />
                            <h3 className="text-[16px] leading-[25px] font-semibold tracking-[0.5px] text-black">
                                판매 타이밍
                            </h3>
                        </div>
                        <div className="flex items-center gap-5">
                            <span className="rounded-full bg-[#83889e] px-5 py-[5px] text-[13px] leading-5 font-semibold tracking-[-0.5px] text-white">
                                {recommendationValue}
                            </span>
                            <span className="text-[10px] leading-[15px] font-normal tracking-[-0.5px] whitespace-nowrap text-[#83889e]">
                                {recommendationLabel}
                            </span>
                        </div>
                    </div>

                    <div className="flex min-h-[166px] flex-col gap-[30px] rounded-[10px] border border-[#d3d3d3] bg-white p-5">
                        <div className="flex flex-col items-start gap-2.5">
                            <Image
                                src="/sell/recommendation-reason.svg"
                                alt=""
                                width={32}
                                height={32}
                            />
                            <h3 className="text-[16px] leading-[25px] font-semibold tracking-[0.5px] text-black">
                                추천 이유
                            </h3>
                        </div>
                        <p className="min-w-0 text-[16px] leading-[25px] font-semibold tracking-[0.5px] break-words break-keep text-[#83889e]">
                            {analysisDescription}
                        </p>
                    </div>
                </div>
            </div>
        </section>
    );
}
