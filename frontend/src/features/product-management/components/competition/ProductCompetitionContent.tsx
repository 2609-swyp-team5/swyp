"use client";

import { ArrowDown, ArrowUp, Minus } from "lucide-react";

import type { ProductCompetition } from "../../types";
import { CompetitionCard } from "./CompetitionCard";

function CompetitionLevelIcon({ level }: { level: ProductCompetition["competition"]["level"] }) {
    if (level === "HIGH") {
        return <ArrowUp aria-hidden="true" className="size-[9px]" strokeWidth={2.5} />;
    }

    if (level === "MEDIUM") {
        return <Minus aria-hidden="true" className="h-[3px] w-[14px]" strokeWidth={2.5} />;
    }

    return <ArrowDown aria-hidden="true" className="size-[9px]" strokeWidth={2.5} />;
}

export function ProductCompetitionContent({
    competition,
    heading = "경쟁 상품 수",
    showCompetitionMeta = true,
    variant = "default",
}: {
    competition: ProductCompetition["competition"];
    heading?: string;
    showCompetitionMeta?: boolean;
    variant?: "default" | "management";
}) {
    return (
        <div className="flex flex-col gap-4 px-1 py-4 md:gap-5 md:px-10 md:py-5">
            <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
                <h2
                    id="product-competition-title"
                    className={
                        variant === "management"
                            ? "typography-heading-bold font-semibold whitespace-nowrap text-[#464646]"
                            : "typography-body-bold font-semibold text-[#464646]"
                    }
                >
                    {heading}
                </h2>
                {showCompetitionMeta ? (
                    <div className="flex items-center gap-[5px]">
                        <span className="typography-body-small font-normal text-[#6653fb]">
                            {competition.count}건
                        </span>
                        <span className="typography-body-bold-small flex items-center gap-[3px] rounded-full border border-[#6653fb] px-3 py-0.5 font-semibold whitespace-nowrap text-[#6653fb]">
                            {competition.levelLabel}
                            <CompetitionLevelIcon level={competition.level} />
                        </span>
                    </div>
                ) : null}
            </div>
            {competition.items.length > 0 ? (
                <div className="grid grid-cols-2 gap-3 md:gap-5 lg:grid-cols-3">
                    {competition.items.map((item) => (
                        <CompetitionCard key={item.productId} item={item} />
                    ))}
                </div>
            ) : (
                <div className="typography-body-small rounded-[8px] bg-white px-4 py-12 text-center text-[#83889e]">
                    현재 등록된 경쟁 상품이 없습니다.
                </div>
            )}
        </div>
    );
}
