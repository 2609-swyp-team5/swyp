"use client";

import Image from "next/image";
import { useState } from "react";

import type { ProductCompetition } from "../../types";
import { formatPrice } from "../analysis/market-analysis/formatters";

const platformBadgeClassNames: Record<string, string> = {
    CARROT: "bg-[#ff6f0f]",
    JOONGNA: "bg-[#ff0000]",
    BUNJANG: "bg-[#403834]",
};

function formatPriceComparison(priceDiffRate: number | null) {
    if (priceDiffRate === null) {
        return "= 평균 시세 집계 중이에요";
    }

    if (priceDiffRate === 0) {
        return "= 평균 수준이에요";
    }

    const rate = Number(Math.abs(priceDiffRate).toFixed(1));
    const direction = priceDiffRate > 0 ? "높아요" : "낮아요";

    return `= 평균보다 ${rate}% ${direction}`;
}

function CompetitionImage({ imageUrl, title }: { imageUrl: string; title: string }) {
    const [hasError, setHasError] = useState(false);

    return (
        <div className="relative h-[160px] shrink-0 bg-[#d3d3d3]">
            {imageUrl && !hasError ? (
                <Image
                    src={imageUrl}
                    alt={`${title} 이미지`}
                    fill
                    unoptimized
                    sizes="(min-width: 1024px) 30vw, 100vw"
                    className="object-cover"
                    onError={() => setHasError(true)}
                />
            ) : null}
        </div>
    );
}

function CompetitionCard({ item }: { item: ProductCompetition["competition"]["items"][number] }) {
    const platformClassName = platformBadgeClassNames[item.platform] ?? "bg-[#83889e]";

    return (
        <a
            href={item.productUrl}
            target="_blank"
            rel="noreferrer"
            className="flex h-[280px] min-w-0 flex-col overflow-hidden rounded-[8px] bg-[#d3d3d3] shadow-[0_0_4px_rgba(0,0,0,0.1)]"
        >
            <div className="relative">
                <CompetitionImage imageUrl={item.imageUrl} title={item.title} />
                <span
                    className={`absolute top-2 left-[10px] rounded-full px-2 py-0.5 text-[11px] leading-[16px] font-bold text-white ${platformClassName}`}
                >
                    {item.platformName}
                </span>
            </div>
            <div className="flex min-h-0 flex-1 flex-col gap-[10px] bg-white p-[10px]">
                <h3 className="truncate text-[13px] leading-5 font-semibold tracking-[-0.5px] text-black">
                    {item.title}
                </h3>
                <div className="whitespace-nowrap">
                    {item.marketAveragePrice !== null && (
                        <p className="text-[13px] leading-[13px] font-semibold text-[#fa503d]">
                            평균가{" "}
                            <span className="line-through">
                                {formatPrice(item.marketAveragePrice)}
                            </span>
                        </p>
                    )}
                    <p className="mt-1 text-[20px] leading-5 font-bold text-[#464646]">
                        {formatPrice(item.listingPrice)}
                    </p>
                </div>
                <p className="mt-auto truncate text-[10px] leading-[15px] tracking-[-0.5px] text-[#363636]">
                    {formatPriceComparison(item.priceDiffRate)}
                </p>
            </div>
        </a>
    );
}

export function ProductCompetitionContent({
    competition,
    heading = "경쟁 상품 수",
    showCompetitionMeta = true,
}: {
    competition: ProductCompetition["competition"];
    heading?: string;
    showCompetitionMeta?: boolean;
}) {
    return (
        <div className="flex flex-col gap-5 px-10 py-5">
            <div className="flex items-center justify-between gap-4">
                <h2
                    id="product-competition-title"
                    className="text-[16px] leading-[25px] font-semibold tracking-[0.5px] text-[#464646]"
                >
                    {heading}
                </h2>
                {showCompetitionMeta ? (
                    <div className="flex items-center gap-3">
                        <span className="text-[16px] leading-[25px] font-semibold tracking-[0.5px] text-[#6653fb]">
                            {competition.count}건
                        </span>
                        <span className="rounded-full border border-[#6653fb] px-[15px] py-0.5 text-[13px] leading-5 font-semibold tracking-[-0.5px] text-[#6653fb]">
                            {competition.levelLabel}
                        </span>
                    </div>
                ) : null}
            </div>
            {competition.items.length > 0 ? (
                <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                    {competition.items.map((item) => (
                        <CompetitionCard key={item.productId} item={item} />
                    ))}
                </div>
            ) : (
                <div className="rounded-[8px] bg-white px-4 py-12 text-center text-[14px] leading-5 text-[#83889e]">
                    현재 등록된 경쟁 상품이 없습니다.
                </div>
            )}
        </div>
    );
}
