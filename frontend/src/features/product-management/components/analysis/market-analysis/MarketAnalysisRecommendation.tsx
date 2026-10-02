import Image from "next/image";

import { cn } from "@/common/lib/utils";

import type { ProductMarketAnalysis } from "../../../types";

export function MarketAnalysisRecommendation({ analysis }: { analysis: ProductMarketAnalysis }) {
    const isHold = analysis.recommendation === "HOLD";

    return (
        <div className="grid min-h-[300px] gap-[30px] bg-white p-[30px] lg:grid-cols-2">
            <div className="flex min-w-0 flex-col justify-center gap-5">
                <span
                    className={cn(
                        "w-fit rounded-full px-[30px] py-[5px] text-[20px] leading-[30px] font-semibold tracking-[0.5px] text-white",
                        isHold ? "bg-[#272727]" : "bg-[#6653fb]",
                    )}
                >
                    {analysis.recommendation}
                </span>
                <div>
                    <h3 className="text-[30px] leading-[42px] font-bold tracking-[0.5px] text-[#363636]">
                        {isHold ? "조금 더 기다려보세요" : "지금 판매를 추천해요!"}
                    </h3>
                    <p className="mt-[10px] max-w-[430px] text-[16px] leading-[25px] text-[#363636]">
                        {analysis.description}
                    </p>
                </div>
            </div>
            <div className="relative grid min-h-[274px] place-items-center">
                <Image
                    src="/figma/product-management/hold-mascot.png"
                    alt="AI 시세 분석 캐릭터"
                    width={274}
                    height={274}
                    className="size-[274px] object-contain"
                />
                <div className="absolute top-0 right-0 flex h-[95px] w-[141px] items-center justify-center rounded-[50%] border border-[#d3d3d3] bg-white px-3 text-center text-[16px] leading-[25px] font-semibold text-black shadow-sm after:absolute after:right-[25px] after:-bottom-[8px] after:size-4 after:rotate-45 after:border-r after:border-b after:border-[#d3d3d3] after:bg-white">
                    <span className="relative z-10">
                        조금만 더
                        <br />
                        기다려봐요!
                    </span>
                </div>
            </div>
        </div>
    );
}
