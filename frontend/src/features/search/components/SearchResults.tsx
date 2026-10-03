"use client";

import { useEffect, useState } from "react";
import type { RefObject } from "react";

import { Button } from "@/common/components/ui/Button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/common/components/ui/Select";
import { Skeleton } from "@/common/components/ui/Skeleton";
import { getApiErrorMessage } from "@/common/lib/api/error";
import { SearchResultCard } from "@/features/search/components/SearchResultCard";
import type { SearchResultItem } from "@/features/search/types";

export function SearchResults({
    keyword,
    products,
    liked,
    onLike,
    isLoading,
    error,
    onRetry,
    isFetchingNextPage,
    hasNextPage,
    loadMoreRef,
}: {
    keyword: string;
    products: SearchResultItem[];
    liked: Record<string, boolean>;
    onLike: (key: string) => void;
    isLoading: boolean;
    error: unknown;
    onRetry: () => void;
    isFetchingNextPage: boolean;
    hasNextPage: boolean;
    loadMoreRef: RefObject<HTMLDivElement | null>;
}) {
    const [now, setNow] = useState(() => Date.now());
    const [sort, setSort] = useState("latest");

    useEffect(() => {
        const timer = window.setInterval(() => setNow(Date.now()), 60_000);
        return () => window.clearInterval(timer);
    }, []);

    return (
        <section
            aria-labelledby="search-results-title"
            className="flex w-full min-w-0 flex-1 flex-col gap-[50px]"
        >
            <div className="flex items-start justify-between gap-4">
                <div className="flex min-w-0 flex-col gap-[5px] text-base leading-[25px]">
                    <h1
                        id="search-results-title"
                        className="font-semibold tracking-[0.5px] break-words text-[#545d82]"
                    >
                        {keyword ? "'" + keyword + "'" : "전체 상품"}
                    </h1>
                    <p className="text-[#6b7395]">
                        {isLoading ? "상품 검색" : `검색결과 ${products.length}개 표시`}
                    </p>
                </div>
                <Select value={sort} onValueChange={setSort}>
                    <SelectTrigger
                        aria-label="정렬 기준"
                        className="w-[126px] shrink-0 border-[#dedee6] bg-white text-[13px] font-semibold tracking-[-0.5px] text-[#83889e]"
                    >
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent align="end">
                        <SelectItem value="recommended">추천순</SelectItem>
                        <SelectItem value="latest">최신순</SelectItem>
                        <SelectItem value="popular">관심순</SelectItem>
                        <SelectItem value="price-high">높은 가격순</SelectItem>
                        <SelectItem value="price-low">낮은 가격순</SelectItem>
                    </SelectContent>
                </Select>
            </div>
            {isLoading ? (
                <p role="status" className="text-base text-[#83889e]">
                    상품을 불러오는 중입니다.
                </p>
            ) : !error && products.length === 0 ? (
                <p role="status" className="text-base text-[#83889e]">
                    검색 결과가 없습니다.
                </p>
            ) : products.length > 0 ? (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {products.map((product) => {
                        const key = `${product.source}:${product.id}`;
                        return (
                            <SearchResultCard
                                key={key}
                                product={product}
                                liked={Boolean(liked[key])}
                                onLike={() => onLike(key)}
                                now={now}
                            />
                        );
                    })}
                    {isFetchingNextPage &&
                        Array.from({ length: 3 }, (_, index) => (
                            <div
                                key={`loading-${index}`}
                                aria-hidden="true"
                                className="overflow-hidden rounded-xl border border-[#f1f1f1] bg-white"
                            >
                                <Skeleton className="h-[180px] w-full rounded-none bg-[#dfdfdf]" />
                                <div className="flex flex-col gap-2.5 p-4">
                                    <Skeleton className="h-[21px] w-16" />
                                    <Skeleton className="h-[22px] w-3/4" />
                                    <Skeleton className="h-[30px] w-1/2" />
                                    <Skeleton className="h-[26px] w-full rounded-full" />
                                    <Skeleton className="h-[18px] w-4/5" />
                                    <Skeleton className="h-[18px] w-1/3" />
                                </div>
                            </div>
                        ))}
                </div>
            ) : null}
            {Boolean(error) && (
                <div className="flex flex-col items-start gap-4">
                    <p role="alert" className="text-base text-[#fa503d]">
                        {getApiErrorMessage(error)}
                    </p>
                    <Button type="button" variant="outline" onClick={onRetry}>
                        다시 시도
                    </Button>
                </div>
            )}
            {isFetchingNextPage && (
                <p role="status" className="sr-only">
                    상품을 더 불러오는 중입니다.
                </p>
            )}
            {hasNextPage && !error && <div ref={loadMoreRef} aria-hidden="true" className="h-px" />}
        </section>
    );
}
