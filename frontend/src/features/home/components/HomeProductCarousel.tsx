"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Heart } from "lucide-react";
import { Button } from "@/common/components/ui/Button";
import { Card, CardContent } from "@/common/components/ui/Card";
import { Badge } from "@/common/components/ui/Badge";
import { cn } from "@/common/lib/utils";

const platforms = [
    { name: "당근마켓", color: "bg-[#ff6f0f]" },
    { name: "중고나라", color: "bg-[#ff0000]" },
    { name: "번개장터", color: "bg-[#0067ff]" },
];

export function HomeProductCarousel({ title }: { title: string }) {
    const [page, setPage] = useState(0);
    const [liked, setLiked] = useState<Record<number, boolean>>({});
    return (
        <div role="region" aria-label={title} className="space-y-5">
            <div className="flex items-center justify-between gap-3 md:gap-8">
                <Button
                    type="button"
                    size="icon-lg"
                    aria-label={`${title} 이전`}
                    onClick={() => setPage((page + 3) % 4)}
                    className="size-10 shrink-0 rounded-full bg-[#272727] text-white hover:bg-[#464646] md:size-12"
                >
                    <ChevronLeft className="size-6" />
                </Button>
                <div className="grid max-w-[901px] min-w-0 flex-1 gap-5 md:grid-cols-3">
                    {platforms.map((platform, index) => {
                        const id = page * 3 + index + 1;
                        return (
                            <Card
                                key={id}
                                className={cn(
                                    "relative h-[350px] gap-0 rounded-xl border border-[#dee5ed] bg-white py-0 ring-0",
                                    index > 0 && "hidden md:flex",
                                )}
                            >
                                <Link
                                    href={`/search/EXTERNAL/${id}`}
                                    aria-label={`${platform.name} 아이폰 13 미니 128GB 핑크 상세보기`}
                                    className="absolute inset-0 z-10 rounded-xl focus-visible:outline-2 focus-visible:outline-[#6653fb]"
                                />
                                <div className="relative h-[180px] shrink-0 bg-[#dfdfdf]">
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        aria-label={`${title} ${platform.name} 관심 상품`}
                                        aria-pressed={Boolean(liked[id])}
                                        onClick={() =>
                                            setLiked((previous) => ({
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
                                            platform.color,
                                        )}
                                    >
                                        {platform.name}
                                    </Badge>
                                </div>
                                <CardContent className="flex flex-1 flex-col justify-between p-4 text-[#545d82]">
                                    <div className="space-y-2.5">
                                        <Badge
                                            className={cn(
                                                "rounded-full border-0 px-2 py-0.5 text-[11px] leading-[16.5px]",
                                                index === 0
                                                    ? "bg-[#fff9c4] text-[#c59b00]"
                                                    : "bg-[#dcfce7] text-[#16a34a]",
                                            )}
                                        >
                                            판매중
                                        </Badge>
                                        <h3 className="text-[15px] leading-[20px] font-semibold">
                                            아이폰 13 미니 128GB 핑크
                                        </h3>
                                        <div>
                                            <p className="text-[13px] leading-[16px] font-semibold text-[#ce3838]">
                                                평균가 <s>350,000원</s>
                                            </p>
                                            <p className="text-[20px] leading-[26px] font-bold">
                                                320,000원
                                            </p>
                                        </div>
                                    </div>
                                    <p
                                        className={cn(
                                            "rounded-full px-2.5 py-1 text-[12px] leading-[18px] font-semibold",
                                            index === 0
                                                ? "bg-[#fff9c4] text-[#c59b00]"
                                                : "bg-[#dcfce7] text-[#16a34a]",
                                        )}
                                    >
                                        {index === 0
                                            ? "≈ 평균 수준이에요"
                                            : "↓ 평균보다 12% 낮아요"}
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
                    onClick={() => setPage((page + 1) % 4)}
                    className="size-10 shrink-0 rounded-full bg-[#272727] text-white hover:bg-[#464646] md:size-12"
                >
                    <ChevronRight className="size-6" />
                </Button>
            </div>
            <div className="flex justify-center gap-[10px]" aria-label={`${title} 페이지 선택`}>
                {[0, 1, 2, 3].map((index) => (
                    <button
                        key={index}
                        type="button"
                        aria-label={`${title} ${index + 1}페이지`}
                        aria-current={page === index ? "page" : undefined}
                        onClick={() => setPage(index)}
                        className="flex h-6 items-center justify-center rounded-full focus-visible:outline-2 focus-visible:outline-[#6653fb]"
                    >
                        <span
                            className={cn(
                                "h-[15px] rounded-full",
                                page === index ? "w-[45px] bg-[#1a202c]" : "w-[15px] bg-[#dee5ed]",
                            )}
                        />
                    </button>
                ))}
            </div>
        </div>
    );
}
