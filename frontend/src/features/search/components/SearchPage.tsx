"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";

import { ScrollToTopButton } from "@/common/components/layout/ScrollToTopButton";
import { useSmoothScroll } from "@/common/hooks/useSmoothScroll";
import { SearchBar } from "@/features/search/components/SearchBar";
import { SearchFilters } from "@/features/search/components/SearchFilters";
import { SearchResults } from "@/features/search/components/SearchResults";
import { useAuthStore } from "@/features/auth/store/authStore";
import { useSearchQuery } from "@/features/search/hooks/queries/useSearchQuery";
import type { SearchParams, SearchSort } from "@/features/search/types";
import { useInterestToggle } from "@/features/interest/hooks/useInterestToggle";
import { Button } from "@/common/components/ui/Button";
import { LoginRequiredDialog } from "@/features/auth/components/LoginRequiredDialog";

export function SearchPage() {
    const searchParams = useSearchParams();
    const [keyword, setKeyword] = useState(searchParams.get("keyword") ?? "");
    const [submittedKeyword, setSubmittedKeyword] = useState(searchParams.get("keyword") ?? "");
    const [sort, setSort] = useState<SearchSort>("LATEST");
    const [filters, setFilters] = useState<SearchParams>({});
    const interests = useInterestToggle();
    const liked = Object.fromEntries(
        interests.interests.map((item) => [`${item.source}:${item.targetId}`, true]),
    );
    const handleScrollToTop = useSmoothScroll();
    const isInitialized = useAuthStore((state) => state.isInitialized);
    const loadMoreRef = useRef<HTMLDivElement>(null);
    const {
        data,
        isPending,
        isError,
        error,
        hasNextPage,
        isFetchingNextPage,
        isFetching,
        isFetchNextPageError,
        fetchNextPage,
        refetch,
    } = useSearchQuery({ ...filters, keyword: submittedKeyword || undefined, sort });
    const products = data?.pages.flatMap((page) => page.content) ?? [];

    useEffect(() => {
        const target = loadMoreRef.current;
        if (!target || !hasNextPage || isFetching || isError) return;

        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) void fetchNextPage();
            },
            { rootMargin: "0px 0px 600px 0px" },
        );
        observer.observe(target);
        return () => observer.disconnect();
    }, [hasNextPage, isFetching, isError, fetchNextPage]);
    return (
        <main className="flex-1 bg-white font-normal tracking-normal">
            <LoginRequiredDialog
                open={interests.loginNoticeOpen}
                onOpenChange={interests.onLoginNoticeOpenChange}
            />
            <SearchBar
                keyword={keyword}
                onKeywordChange={setKeyword}
                onSearch={() => setSubmittedKeyword(keyword.trim())}
            />
            <div className="layout-container flex flex-col items-start gap-8 py-[60px] xl:flex-row xl:gap-[60px]">
                <SearchFilters
                    filters={filters}
                    onFiltersChange={setFilters}
                    keyword={keyword}
                    onKeywordChange={setKeyword}
                    onKeywordSubmit={() => setSubmittedKeyword(keyword.trim())}
                />
                <div className="flex min-w-0 flex-1 flex-col gap-4">
                    {interests.errorMessage && (
                        <div
                            role="alert"
                            className="text-destructive flex items-center gap-3 text-sm"
                        >
                            <p>{interests.errorMessage}</p>
                            {interests.canRetry && (
                                <Button variant="outline" onClick={interests.retry}>
                                    관심상품 다시 조회
                                </Button>
                            )}
                        </div>
                    )}
                    <SearchResults
                        sort={sort}
                        onSortChange={setSort}
                        keyword={submittedKeyword}
                        products={products}
                        liked={liked}
                        onLike={(product) =>
                            interests.toggle({ source: product.source, targetId: product.id })
                        }
                        likeDisabled={interests.disabled}
                        isLoading={!isInitialized || isPending}
                        error={isError ? error : null}
                        onRetry={() => void (isFetchNextPageError ? fetchNextPage() : refetch())}
                        isFetchingNextPage={isFetchingNextPage}
                        hasNextPage={Boolean(hasNextPage)}
                        loadMoreRef={loadMoreRef}
                    />
                </div>
            </div>
            <ScrollToTopButton onClick={handleScrollToTop} />
        </main>
    );
}
