import Image from "next/image";

import { cn } from "@/common/lib/utils";

import type { ProductMarketAnalysis } from "../../../types";

type MarketAnalysisRecommendationProps = {
    analysis: ProductMarketAnalysis;
    variant?: "default" | "management";
};

export function MarketAnalysisRecommendation({
    analysis,
    variant = "default",
}: MarketAnalysisRecommendationProps) {
    const copy = {
        SELL: {
            title: "지금 판매를 추천해요!",
            image: "/figma/product-management/sell-mascot.svg",
        },
        HOLD: {
            title: "조금 더 기다려보세요",
            image: "/figma/product-management/hold-mascot.svg",
        },
        BUY: {
            title: "지금 구매를 추천해요!",
            image: "/figma/product-management/buy-mascot.svg",
        },
        WAIT: {
            title: "조금 더 기다리면 좋아요",
            image: "/figma/product-management/wait-mascot.svg",
        },
    }[analysis.recommendation];
    const isWait = analysis.recommendation === "HOLD" || analysis.recommendation === "WAIT";

    if (variant === "management") {
        return (
            <div className="grid min-h-[183px] gap-2.5 lg:grid-cols-[minmax(0,1fr)_198px]">
                <div className="flex min-w-0 flex-col justify-center gap-[13px] py-5">
                    <span
                        className={cn(
                            "typography-heading-bold w-fit rounded-full px-5 py-[3px] font-semibold text-white",
                            isWait ? "bg-[#272727]" : "bg-[#6653fb]",
                        )}
                    >
                        {analysis.recommendation}
                    </span>
                    <div className="flex flex-col gap-[10px]">
                        <h3 className="typography-heading-bold font-semibold text-[#363636]">
                            {copy.title}
                        </h3>
                        <p className="typography-body-medium max-w-[414px] text-[#363636]">
                            {analysis.description}
                        </p>
                    </div>
                </div>
                <div className="flex items-center justify-center">
                    <Image
                        src={copy.image}
                        alt="AI 시세 분석 캐릭터"
                        width={198}
                        height={183}
                        className="h-[183px] w-[198px] object-contain"
                    />
                </div>
            </div>
        );
    }

    return (
        <div className="grid min-h-[300px] gap-[30px] bg-white p-[30px] lg:grid-cols-2">
            <div className="flex min-w-0 flex-col justify-center gap-5">
                <span
                    className={cn(
                        "typography-heading-03 w-fit rounded-full px-[30px] py-[5px] font-semibold text-white",
                        isWait ? "bg-[#272727]" : "bg-[#6653fb]",
                    )}
                >
                    {analysis.recommendation}
                </span>
                <div>
                    <h3 className="typography-heading-02 font-bold text-[#363636]">{copy.title}</h3>
                    <p className="typography-body-medium mt-[10px] max-w-[430px] text-[#363636]">
                        {analysis.description}
                    </p>
                </div>
            </div>
            <div className="relative grid min-h-[274px] place-items-center">
                <Image
                    src={copy.image}
                    alt="AI 시세 분석 캐릭터"
                    width={274}
                    height={274}
                    className="size-[274px] object-contain"
                />
            </div>
        </div>
    );
}
