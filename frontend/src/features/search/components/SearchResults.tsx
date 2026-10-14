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
import { Loader2 } from "lucide-react";

import { getApiErrorMessage } from "@/common/lib/api/error";
import { cn } from "@/common/lib/utils";
import { SearchResultCard } from "@/features/search/components/SearchResultCard";
import { SearchResultCardSkeleton } from "@/features/search/components/SearchResultCardSkeleton";
import type { SearchResultItem, SearchSort } from "@/features/search/types";

export function SearchResults({
    sort,
    onSortChange,
    keyword,
    products,
    totalCount,
    onLike,
    likeDisabled,
    isLoading,
    isRefreshing = false,
    error,
    onRetry,
    isFetchingNextPage,
    hasNextPage,
    loadMoreRef,
}: {
    sort: SearchSort;
    onSortChange: (sort: SearchSort) => void;
    keyword: string;
    products: SearchResultItem[];
    totalCount: number | null;
    onLike: (product: SearchResultItem) => void;
    likeDisabled: boolean;
    isLoading: boolean;
    /** 정렬·필터 변경으로 이전 결과를 보여주며 새 결과를 불러오는 중 */
    isRefreshing?: boolean;
    error: unknown;
    onRetry: () => void;
    isFetchingNextPage: boolean;
    hasNextPage: boolean;
    loadMoreRef: RefObject<HTMLDivElement | null>;
}) {
    const [now, setNow] = useState(() => Date.now());

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
                        {isLoading || isRefreshing
                            ? "상품 검색"
                            : totalCount === null
                              ? "검색결과"
                              : `검색결과 ${totalCount}개`}
                    </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                    {isRefreshing && (
                        <Loader2
                            className="size-4 animate-spin text-[#83889e]"
                            aria-hidden="true"
                        />
                    )}
                    <Select
                        value={sort}
                        onValueChange={(value) => onSortChange(value as SearchSort)}
                    >
                        <SelectTrigger
                            aria-label="정렬 기준"
                            className="w-[126px] shrink-0 border-[#dedee6] bg-white text-[13px] font-semibold tracking-[-0.5px] text-[#83889e]"
                        >
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent align="end">
                            <SelectItem value="LATEST">최신순</SelectItem>
                            <SelectItem value="RECOMMENDED">추천순</SelectItem>
                            <SelectItem value="INTEREST">관심순</SelectItem>
                            <SelectItem value="PRICE_HIGH">높은 가격순</SelectItem>
                            <SelectItem value="PRICE_LOW">낮은 가격순</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>
            {isLoading ? (
                <>
                    <p role="status" className="sr-only">
                        상품을 불러오는 중입니다.
                    </p>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {Array.from({ length: 6 }, (_, index) => (
                            <SearchResultCardSkeleton key={index} />
                        ))}
                    </div>
                </>
            ) : !error && products.length === 0 ? (
                <p role="status" className="text-base text-[#83889e]">
                    검색 결과가 없습니다.
                </p>
            ) : products.length > 0 ? (
                <div
                    aria-busy={isRefreshing}
                    className={cn(
                        "relative grid grid-cols-1 gap-4 transition-opacity sm:grid-cols-2 lg:grid-cols-3",
                        isRefreshing && "pointer-events-none opacity-50",
                    )}
                >
                    {products.map((product) => {
                        return (
                            <SearchResultCard
                                key={`${product.source}:${product.id}`}
                                product={product}
                                liked={product.favorite}
                                onLike={() => onLike(product)}
                                likeDisabled={likeDisabled}
                                now={now}
                            />
                        );
                    })}
                    {isFetchingNextPage &&
                        Array.from({ length: 3 }, (_, index) => (
                            <SearchResultCardSkeleton key={`loading-${index}`} />
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
