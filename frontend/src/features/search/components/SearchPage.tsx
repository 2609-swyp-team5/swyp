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
import type { SearchPlatform, SearchStatus } from "@/features/search/types";

export function SearchPage() {
    const searchParams = useSearchParams();
    const [keyword, setKeyword] = useState(searchParams.get("keyword") ?? "");
    const [submittedKeyword, setSubmittedKeyword] = useState(searchParams.get("keyword") ?? "");
    const [status, setStatus] = useState<SearchStatus>();
    const [platform, setPlatform] = useState<SearchPlatform>("ALL");
    const [liked, setLiked] = useState<Record<string, boolean>>({});
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
    } = useSearchQuery(submittedKeyword, status);
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
            <SearchBar
                keyword={keyword}
                onKeywordChange={setKeyword}
                onSearch={() => setSubmittedKeyword(keyword.trim())}
            />
            <div className="layout-container flex flex-col items-start gap-8 py-[60px] xl:flex-row xl:gap-[60px]">
                <SearchFilters
                    platform={platform}
                    onPlatformChange={setPlatform}
                    status={status}
                    onStatusChange={setStatus}
                />
                <SearchResults
                    keyword={submittedKeyword}
                    products={products}
                    liked={liked}
                    onLike={(key) => setLiked((current) => ({ ...current, [key]: !current[key] }))}
                    isLoading={!isInitialized || isPending}
                    error={isError ? error : null}
                    onRetry={() => void (isFetchNextPageError ? fetchNextPage() : refetch())}
                    isFetchingNextPage={isFetchingNextPage}
                    hasNextPage={Boolean(hasNextPage)}
                    loadMoreRef={loadMoreRef}
                />
            </div>
            <ScrollToTopButton onClick={handleScrollToTop} />
        </main>
    );
}
