"use client";

import { useState, useSyncExternalStore } from "react";
import Link from "next/link";
import Image from "next/image";
import { ChevronLeft, ChevronRight, Heart } from "lucide-react";
import { Button } from "@/common/components/ui/Button";
import { Card, CardContent } from "@/common/components/ui/Card";
import { Badge } from "@/common/components/ui/Badge";
import { cn } from "@/common/lib/utils";
import type { ProductSummaryResponse } from "@/features/sell/types";

const platforms = [
    { name: "당근마켓", color: "bg-[#ff6f0f]" },
    { name: "중고나라", color: "bg-[#ff0000]" },
    { name: "번개장터", color: "bg-[#0067ff]" },
];

export type CarouselProduct = Pick<
    ProductSummaryResponse,
    "id" | "title" | "price" | "status" | "thumbnailUrl" | "marketAveragePrice"
> & { platformName: string };

const statusLabels = { DRAFT: "임시저장", ON_SALE: "판매중", SOLD_OUT: "판매완료" };

const subscribeViewport = (onChange: () => void) => {
    const query = window.matchMedia("(min-width: 768px)");
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
};

export function HomeProductCarousel({
    title,
    products,
    interestActions,
}: {
    title: string;
    products: CarouselProduct[];
    interestActions?: {
        liked: Record<number, boolean>;
        disabled: boolean;
        toggle: (id: number) => void;
    };
}) {
    const [page, setPage] = useState(0);
    const [localLiked, setLiked] = useState<Record<number, boolean>>({});
    const liked = interestActions?.liked ?? localLiked;
    const isDesktop = useSyncExternalStore(
        subscribeViewport,
        () => window.matchMedia("(min-width: 768px)").matches,
        () => true,
    );
    const pageSize = isDesktop ? 3 : 1;
    const pageCount = Math.ceil(products.length / pageSize);
    const currentPage = Math.min(page, Math.max(0, pageCount - 1));
    const visibleProducts = products.slice(currentPage * pageSize, (currentPage + 1) * pageSize);
    return (
        <div role="region" aria-label={title} className="space-y-5">
            <div className="flex items-center justify-between gap-3 md:gap-8">
                <Button
                    type="button"
                    size="icon-lg"
                    aria-label={`${title} 이전`}
                    onClick={() => setPage((currentPage + pageCount - 1) % pageCount)}
                    disabled={pageCount <= 1}
                    className="size-10 shrink-0 rounded-full bg-[#272727] text-white hover:bg-[#464646] md:size-12"
                >
                    <ChevronLeft className="size-6" />
                </Button>
                <div className="grid max-w-[901px] min-w-0 flex-1 gap-5 md:grid-cols-3">
                    {visibleProducts.map((product) => {
                        const { id } = product;
                        const platformColor =
                            platforms.find((platform) => platform.name === product.platformName)
                                ?.color ?? "bg-[#6653fb]";
                        const difference =
                            product.marketAveragePrice && product.marketAveragePrice > 0
                                ? Math.round(
                                      ((product.price - product.marketAveragePrice) /
                                          product.marketAveragePrice) *
                                          100,
                                  )
                                : null;
                        const comparison =
                            difference === null
                                ? "비교 데이터 부족"
                                : difference === 0
                                  ? "≈ 평균 수준이에요"
                                  : difference < 0
                                    ? `↓ 평균보다 ${Math.abs(difference)}% 낮아요`
                                    : `↑ 평균보다 ${difference}% 높아요`;
                        return (
                            <Card
                                key={id}
                                className="relative h-[350px] gap-0 rounded-xl border border-[#dee5ed] bg-white py-0 ring-0"
                            >
                                <Link
                                    href={`/search/${id}`}
                                    aria-label={`${product.title} 상세보기`}
                                    className="absolute inset-0 z-10 rounded-xl focus-visible:outline-2 focus-visible:outline-[#6653fb]"
                                />
                                <div className="relative h-[180px] shrink-0 bg-[#dfdfdf]">
                                    {product.thumbnailUrl && (
                                        <Image
                                            src={product.thumbnailUrl}
                                            alt={product.title}
                                            fill
                                            unoptimized
                                            sizes="(min-width: 768px) 33vw, 100vw"
                                            className="object-cover"
                                        />
                                    )}
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        aria-label={`${title} ${product.title} 관심 상품`}
                                        aria-pressed={Boolean(liked[id])}
                                        disabled={interestActions?.disabled}
                                        onClick={() =>
                                            interestActions
                                                ? interestActions.toggle(id)
                                                : setLiked((previous) => ({
                                                      ...previous,
                                                      [id]: !previous[id],
                                                  }))
                                        }
                                        className={cn(
                                            "absolute top-3 right-3 z-20 size-8 rounded-full bg-white shadow-sm hover:bg-[#fafbff]",
                                            liked[id]
                                                ? "text-[#fa503d] hover:text-[#fa503d]"
                                                : "text-black",
                                        )}
                                    >
                                        <Heart
                                            className="size-4"
                                            fill={liked[id] ? "currentColor" : "none"}
                                            strokeWidth={1.5}
                                        />
                                    </Button>
                                    <Badge
                                        className={cn(
                                            "absolute bottom-3 left-3 rounded-full border-0 px-2 py-px text-[11px] leading-[16.5px] font-bold text-white",
                                            platformColor,
                                        )}
                                    >
                                        {product.platformName}
                                    </Badge>
                                </div>
                                <CardContent className="flex flex-1 flex-col justify-between p-4 text-[#545d82]">
                                    <div className="space-y-2.5">
                                        <Badge
                                            className={cn(
                                                "rounded-full border-0 px-2 py-0.5 text-[11px] leading-[16.5px]",
                                                difference !== null && difference >= 0
                                                    ? "bg-[#fff9c4] text-[#c59b00]"
                                                    : "bg-[#dcfce7] text-[#16a34a]",
                                            )}
                                        >
                                            {statusLabels[product.status]}
                                        </Badge>
                                        <h3 className="line-clamp-2 text-[15px] leading-[20px] font-semibold break-words">
                                            {product.title}
                                        </h3>
                                        <div>
                                            {product.marketAveragePrice !== null && (
                                                <p className="text-[13px] leading-[16px] font-semibold text-[#ce3838]">
                                                    평균가{" "}
                                                    <s>
                                                        {product.marketAveragePrice.toLocaleString(
                                                            "ko-KR",
                                                        )}
                                                        원
                                                    </s>
                                                </p>
                                            )}
                                            <p className="text-[20px] leading-[26px] font-bold">
                                                {product.price.toLocaleString("ko-KR")}원
                                            </p>
                                        </div>
                                    </div>
                                    <p
                                        className={cn(
                                            "rounded-full px-2.5 py-1 text-[12px] leading-[18px] font-semibold",
                                            difference !== null && difference >= 0
                                                ? "bg-[#fff9c4] text-[#c59b00]"
                                                : "bg-[#dcfce7] text-[#16a34a]",
                                        )}
                                    >
                                        {comparison}
                                    </p>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
                <Button
                    type="button"
                    size="icon-lg"
                    aria-label={`${title} 다음`}
                    onClick={() => setPage((currentPage + 1) % pageCount)}
                    disabled={pageCount <= 1}
                    className="size-10 shrink-0 rounded-full bg-[#272727] text-white hover:bg-[#464646] md:size-12"
                >
                    <ChevronRight className="size-6" />
                </Button>
            </div>
            <div className="flex justify-center gap-[10px]" aria-label={`${title} 페이지 선택`}>
                {Array.from({ length: pageCount }, (_, index) => (
                    <button
                        key={index}
                        type="button"
                        aria-label={`${title} ${index + 1}페이지`}
                        aria-current={currentPage === index ? "page" : undefined}
                        onClick={() => setPage(index)}
                        className="flex h-6 items-center justify-center rounded-full focus-visible:outline-2 focus-visible:outline-[#6653fb]"
                    >
                        <span
                            className={cn(
                                "h-[15px] rounded-full",
                                currentPage === index
                                    ? "w-[45px] bg-[#1a202c]"
                                    : "w-[15px] bg-[#dee5ed]",
                            )}
                        />
                    </button>
                ))}
            </div>
        </div>
    );
}
