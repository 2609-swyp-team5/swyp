"use client";

import Image from "next/image";
import Link from "next/link";
import { Heart } from "lucide-react";

import { Badge } from "@/common/components/ui/Badge";
import { Button } from "@/common/components/ui/Button";
import { Card, CardContent } from "@/common/components/ui/Card";
import { cn } from "@/common/lib/utils";
import { formatRelativeCreatedAt } from "@/features/search/utils/formatRelativeCreatedAt";
import {
    conditionLabels,
    defectLabels,
} from "@/features/sell/components/manage/productReviewUtils";
import type { SearchResultItem } from "@/features/search/types";

const statusLabels: Record<string, string> = {
    DRAFT: "등록됨",
    ON_SALE: "판매중",
    SOLD_OUT: "판매완료",
    SELLING: "판매중",
};

export function SearchResultCard({
    product,
    liked,
    onLike,
    now,
}: {
    product: SearchResultItem;
    liked: boolean;
    onLike: () => void;
    now: number;
}) {
    const status = statusLabels[product.status] ?? product.status;
    const sold = product.status === "SOLD_OUT";
    const platform =
        product.source === "OUR" ? "지금이니?!" : (product.platformName ?? "외부 매물");
    const platformClass =
        platform === "당근마켓"
            ? "bg-[#ff6f0f]"
            : platform === "번개장터"
              ? "bg-[#83889e]"
              : platform === "중고나라"
                ? "bg-[#ff0000]"
                : "bg-[#6653fb]";
    const average = product.marketAveragePrice;
    const difference =
        average !== null && average > 0
            ? Math.round(((product.price - average) / average) * 100)
            : null;
    const comparison =
        difference === null
            ? "? 비교 데이터 부족"
            : difference === 0
              ? "≈ 평균 수준이에요"
              : difference < 0
                ? "↓ 평균보다 " + Math.abs(difference) + "% 낮아요"
                : "↑ 평균보다 " + difference + "% 높아요";

    return (
        <Card className="relative gap-0 rounded-xl border border-[#f1f1f1] bg-white py-0 text-[#6b6c7b] ring-0">
            <Link
                href={`/search/${product.source}/${product.id}`}
                className="absolute inset-0 z-10 rounded-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6653fb]"
                aria-label={`${product.title} 상세보기`}
            />
            <div className="relative h-[180px] shrink-0 bg-[#dfdfdf]">
                {product.thumbnailUrl && (
                    <Image
                        src={product.thumbnailUrl}
                        alt={product.title}
                        fill
                        unoptimized
                        sizes="(max-width: 639px) 100vw, (max-width: 1023px) 50vw, 33vw"
                        className="object-cover"
                    />
                )}
                {sold && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/25">
                        <span className="rounded bg-black/30 px-3 py-1 text-sm leading-[22px] font-bold text-white">
                            판매완료
                        </span>
                    </div>
                )}
                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={product.title + " 관심 상품"}
                    aria-pressed={liked}
                    onClick={onLike}
                    className={cn(
                        "absolute top-3 right-3 z-20 rounded-full bg-white shadow-sm hover:bg-[#fafbff]",
                        liked
                            ? "text-[#fa503d] hover:text-[#fa503d]"
                            : "text-[#363636] hover:text-[#363636]",
                    )}
                >
                    <Heart
                        aria-hidden="true"
                        className="size-4"
                        strokeWidth={1.5}
                        fill={liked ? "currentColor" : "none"}
                    />
                </Button>
                <Badge
                    className={cn(
                        "font-brand absolute bottom-3 left-3 h-auto rounded-full border-0 px-2 py-px text-[11px] leading-[16.5px] font-bold text-white",
                        platformClass,
                    )}
                >
                    {platform}
                </Badge>
            </div>
            <CardContent
                className={cn("font-brand flex flex-col gap-2.5 p-4", sold && "opacity-70")}
            >
                <Badge
                    className={cn(
                        "h-auto self-start rounded-full border-0 px-2 py-0.5 text-[11px] leading-[16.5px] font-medium",
                        product.status === "ON_SALE"
                            ? "bg-[#fafbff] text-[#6653fb]"
                            : "bg-[#f1f1f1] text-[#83889e]",
                    )}
                >
                    {status}
                </Badge>
                <h2
                    className="truncate text-[15px] leading-[22px] font-semibold"
                    title={product.title}
                >
                    {product.title}
                </h2>
                <p className="text-xl leading-[30px] font-bold">
                    {product.price.toLocaleString("ko-KR")}원
                </p>
                <Badge
                    className={cn(
                        "h-auto w-full justify-start rounded-full border-0 px-2.5 py-1 text-xs leading-[18px] font-semibold",
                        difference === null || difference === 0
                            ? "bg-[#f1f1f1] text-[#6b6c7b]"
                            : "bg-[#fafbff] text-[#6653fb]",
                    )}
                >
                    {comparison}
                </Badge>
                <p className="text-xs leading-[18px] text-[#464646]">
                    {product.condition ? `${conditionLabels[product.condition]} · ` : ""}
                    {product.defectStatus ? `${defectLabels[product.defectStatus]} · ` : ""}
                    <time dateTime={product.createdAt}>
                        {formatRelativeCreatedAt(product.createdAt, now)}
                    </time>
                </p>
                <p className="text-xs leading-[18px] text-[#464646]">{product.categoryName}</p>
            </CardContent>
        </Card>
    );
}
