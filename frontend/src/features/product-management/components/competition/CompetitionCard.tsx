"use client";

import { ImageOff } from "lucide-react";
import Image from "next/image";
import { useState } from "react";

import type { ProductCompetition } from "../../types";
import { formatPrice } from "../analysis/market-analysis/formatters";
import { isOptimizableImageUrl } from "@/common/lib/image/optimizableImage";

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
    const showPlaceholder = !imageUrl || hasError;

    return (
        <div className="relative flex h-[160px] shrink-0 items-center justify-center bg-[#d3d3d3]">
            {showPlaceholder ? (
                <ImageOff
                    aria-label={`${title} 이미지 없음`}
                    className="size-8 text-[#83889e]"
                    strokeWidth={1.5}
                />
            ) : (
                <Image
                    src={imageUrl}
                    alt={`${title} 이미지`}
                    fill
                    unoptimized={!isOptimizableImageUrl(imageUrl)}
                    sizes="(min-width: 1024px) 30vw, 100vw"
                    className="object-cover"
                    onError={() => setHasError(true)}
                />
            )}
        </div>
    );
}

export function CompetitionCard({
    item,
}: {
    item: ProductCompetition["competition"]["items"][number];
}) {
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
                    className={`typography-body-small absolute top-2 left-[10px] rounded-full px-2 py-0.5 font-bold text-white ${platformClassName}`}
                >
                    {item.platformName}
                </span>
            </div>
            <div className="flex min-h-0 flex-1 flex-col gap-[10px] bg-white p-[10px]">
                <h3 className="typography-body-bold-small truncate font-semibold text-black">
                    {item.title}
                </h3>
                <div className="whitespace-nowrap">
                    {item.marketAveragePrice !== null && (
                        <p className="typography-body-bold-small font-semibold text-[#fa503d]">
                            평균가{" "}
                            <span className="line-through">
                                {formatPrice(item.marketAveragePrice)}
                            </span>
                        </p>
                    )}
                    <p className="typography-heading-03 mt-1 font-bold text-[#464646]">
                        {formatPrice(item.listingPrice)}
                    </p>
                </div>
                <p className="typography-caption mt-auto truncate text-[#363636]">
                    {formatPriceComparison(item.priceDiffRate)}
                </p>
            </div>
        </a>
    );
}
