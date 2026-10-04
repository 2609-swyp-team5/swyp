"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";

import { ScrollToTopButton } from "@/common/components/layout/ScrollToTopButton";
import { useSmoothScroll } from "@/common/hooks/useSmoothScroll";
import { SearchBar } from "@/features/search/components/SearchBar";
import { SearchFilters } from "@/features/search/components/SearchFilters";
import { SearchResults } from "@/features/search/components/SearchResults";
import { AiSearchSummary } from "@/features/search/components/AiSearchSummary";
import { useAuthStore } from "@/features/auth/store/authStore";
import { useSearchQuery } from "@/features/search/hooks/queries/useSearchQuery";
import type { SearchParams, SearchSort } from "@/features/search/types";
import { useInterestToggle } from "@/features/search/hooks/useInterestToggle";
import { Button } from "@/common/components/ui/Button";
import { LoginRequiredDialog } from "@/features/auth/components/LoginRequiredDialog";
import { useAiSearchMutation } from "@/features/search/hooks/mutations/useAiSearchMutation";
import { getApiErrorMessage } from "@/common/lib/api/error";

export function SearchPage() {
    const searchParams = useSearchParams();
    const initialMode = searchParams.get("mode") === "ai" ? "ai" : "general";
    const initialAiSearchStarted = useRef(false);
    const [canLoadProducts, setCanLoadProducts] = useState(initialMode !== "ai");
    const [keyword, setKeyword] = useState(searchParams.get("keyword") ?? "");
    const [submittedKeyword, setSubmittedKeyword] = useState(searchParams.get("keyword") ?? "");
    const [sort, setSort] = useState<SearchSort>("LATEST");
    const [filters, setFilters] = useState<SearchParams>({});
    const [searchMessage, setSearchMessage] = useState("");
    const [hasAiResult, setHasAiResult] = useState(false);
    const queryClient = useQueryClient();
    const aiSearch = useAiSearchMutation();
    const isLoggedIn = useAuthStore((state) => state.isLoggedIn);
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
    } = useSearchQuery(
        { ...filters, keyword: submittedKeyword || undefined, sort },
        hasAiResult ? Infinity : 0,
        canLoadProducts,
    );
    const products = data?.pages.flatMap((page) => page.content) ?? [];

    const submitSearch = useCallback(
        (mode: "general" | "ai") => {
            if (aiSearch.isPending) return;
            aiSearch.reset();
            setSearchMessage("");
            if (mode === "general") {
                setCanLoadProducts(true);
                setHasAiResult(false);
                setSubmittedKeyword(keyword.trim());
                return;
            }
            if (!isLoggedIn) {
                interests.onLoginNoticeOpenChange(true);
                return;
            }
            const query = keyword.trim();
            if (!query || query.length > 200) {
                setSearchMessage("AI 검색어를 1~200자로 입력해 주세요.");
                return;
            }
            aiSearch.mutate(query, {
                onSuccess: async ({ condition, result }) => {
                    const nextFilters: SearchParams = {
                        excludeKeyword: condition.excludeKeyword ?? undefined,
                        status: condition.status,
                        platform: condition.platform,
                        minPrice: condition.minPrice ?? undefined,
                        maxPrice: condition.maxPrice ?? undefined,
                        condition: condition.condition,
                        defectStatus: condition.defectStatus,
                    };
                    const nextKeyword = condition.keyword ?? "";
                    const params = {
                        ...nextFilters,
                        keyword: nextKeyword || undefined,
                        sort: condition.sort,
                    };
                    await queryClient.cancelQueries({ queryKey: ["search"] });
                    // 첫 페이지는 AI 응답을 사용하고, 이후 페이지는 해석된 조건으로 일반 검색한다.
                    queryClient.setQueryData(["search", params], {
                        pages: [result],
                        pageParams: [null],
                    });
                    setFilters(nextFilters);
                    setCanLoadProducts(true);
                    setHasAiResult(true);
                    setSort(condition.sort);
                    setSubmittedKeyword(nextKeyword);
                },
            });
        },
        [aiSearch, keyword, isLoggedIn, interests, queryClient],
    );

    useEffect(() => {
        if (initialMode !== "ai" || !isInitialized || initialAiSearchStarted.current) return;
        initialAiSearchStarted.current = true;
        submitSearch("ai");
    }, [initialMode, isInitialized, submitSearch]);

    useEffect(() => {
        const target = loadMoreRef.current;
        if (!target || !hasNextPage || isFetching || isError || aiSearch.isPending) return;

        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) void fetchNextPage();
            },
            { rootMargin: "0px 0px 600px 0px" },
        );
        observer.observe(target);
        return () => observer.disconnect();
    }, [hasNextPage, isFetching, isError, fetchNextPage, aiSearch.isPending]);
    return (
        <main className="flex-1 bg-white font-normal tracking-normal">
            <LoginRequiredDialog
                open={interests.loginNoticeOpen}
                onOpenChange={interests.onLoginNoticeOpenChange}
            />
            <SearchBar
                initialMode={initialMode}
                keyword={keyword}
                onKeywordChange={setKeyword}
                onSearch={submitSearch}
                isSearching={aiSearch.isPending}
            />
            <div className="layout-container flex flex-col items-start gap-8 py-[60px] xl:flex-row xl:gap-[60px]">
                <SearchFilters
                    key={aiSearch.data ? JSON.stringify(aiSearch.data.condition) : "general"}
                    disabled={aiSearch.isPending}
                    filters={filters}
                    onFiltersChange={(nextFilters) => {
                        setHasAiResult(false);
                        setFilters(nextFilters);
                    }}
                    keyword={keyword}
                    onKeywordChange={setKeyword}
                    onKeywordSubmit={() => submitSearch("general")}
                />
                <div className="flex min-w-0 flex-1 flex-col gap-4">
                    {(aiSearch.isPending || aiSearch.isSuccess) && (
                        <AiSearchSummary
                            query={aiSearch.variables ?? ""}
                            isLoading={aiSearch.isPending}
                            aiApplied={aiSearch.data?.aiApplied}
                            params={{ ...filters, keyword: submittedKeyword || undefined, sort }}
                        />
                    )}
                    {(searchMessage || aiSearch.isError) && (
                        <p
                            role={aiSearch.isError ? "alert" : "status"}
                            className="text-sm text-[#6b7395]"
                        >
                            {aiSearch.isError ? getApiErrorMessage(aiSearch.error) : searchMessage}
                        </p>
                    )}
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
                        onSortChange={(nextSort) => {
                            setHasAiResult(false);
                            setSort(nextSort);
                        }}
                        keyword={submittedKeyword}
                        products={products}
                        totalCount={data?.pages[0]?.totalCount ?? null}
                        liked={liked}
                        onLike={(product) =>
                            interests.toggle({ source: product.source, targetId: product.id })
                        }
                        likeDisabled={interests.disabled}
                        isLoading={
                            !isInitialized || (canLoadProducts && isPending) || aiSearch.isPending
                        }
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
