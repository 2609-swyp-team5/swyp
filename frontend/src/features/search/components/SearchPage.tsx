"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { ScrollToTopButton } from "@/common/components/layout/ScrollToTopButton";
import { useSmoothScroll } from "@/common/hooks/useSmoothScroll";
import { SearchBar } from "@/features/search/components/SearchBar";
import { InterestAddedDialog } from "@/features/search/components/detail/InterestAddedDialog";
import { SearchFilters } from "@/features/search/components/SearchFilters";
import { SearchResults } from "@/features/search/components/SearchResults";
import { useAuthStore } from "@/features/auth/store/authStore";
import { useSearchQuery } from "@/features/search/hooks/queries/useSearchQuery";
import type { SearchParams, SearchSort } from "@/features/search/types";
import { parseSearchUrl, toSearchQuery } from "@/features/search/utils/searchUrlState";
import { useInterestToggle } from "@/features/interest/hooks/useInterestToggle";
import { Button } from "@/common/components/ui/Button";
import { LoginRequiredDialog } from "@/features/auth/components/LoginRequiredDialog";

export function SearchPage() {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    // 검색어·정렬·필터는 URL과 같이 둔다(새로고침·공유·뒤로 가기에도 같은 결과). 화면은 바로 반응하도록 상태를 먼저 바꾸고
    // URL을 맞추며, 뒤로 가기처럼 화면 밖에서 URL이 바뀌면 URL 값을 다시 읽는다
    const query = searchParams.toString();
    const [searchState, setSearchState] = useState(() => parseSearchUrl(searchParams));
    const { keyword: submittedKeyword, sort, filters } = searchState;
    const [keyword, setKeyword] = useState(submittedKeyword);
    const [seenQuery, setSeenQuery] = useState(query);
    // 이 화면이 바꾼(아직 반영 중일 수 있는) URL 목록 — 연달아 바꿀 때 앞선 URL이 늦게 와도 바깥 변경으로 오인하지 않는다
    const [writtenQueries, setWrittenQueries] = useState([query]);
    // 필터 입력값(가격·제외어)은 SearchFilters 내부 상태라 URL에서 다시 읽을 때 새로 만든다
    const [filtersKey, setFiltersKey] = useState(0);
    if (query !== seenQuery) {
        setSeenQuery(query);
        const writtenIndex = writtenQueries.indexOf(query);
        if (writtenIndex >= 0) {
            setWrittenQueries(writtenQueries.slice(writtenIndex));
        } else {
            const next = parseSearchUrl(searchParams);
            setSearchState(next);
            setKeyword(next.keyword);
            setWrittenQueries([query]);
            setFiltersKey((current) => current + 1);
        }
    }
    const interests = useInterestToggle();
    // 관심상품 등록 안내 팝업(검색 상세와 같음) — 닫힐 때 문구가 바뀌지 않도록 가격은 열림 상태와 따로 둔다
    const [interestDialogOpen, setInterestDialogOpen] = useState(false);
    const [interestDialogPrice, setInterestDialogPrice] = useState(0);
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
        isPlaceholderData,
        fetchNextPage,
        refetch,
    } = useSearchQuery({ ...filters, keyword: submittedKeyword || undefined, sort });
    const products = data?.pages.flatMap((page) => page.content) ?? [];

    // 새 검색어는 기록을 남기고(push), 정렬·필터 변경은 같은 검색 안에서 바꾼다(replace)
    const navigate = (
        next: { keyword?: string; sort?: SearchSort; filters?: SearchParams },
        mode: "push" | "replace",
    ) => {
        const nextState = {
            keyword: next.keyword ?? submittedKeyword,
            sort: next.sort ?? sort,
            filters: next.filters ?? filters,
        };
        const nextQuery = toSearchQuery(nextState);
        setSearchState(nextState);
        if (nextQuery === writtenQueries.at(-1)) return;
        setWrittenQueries([...writtenQueries, nextQuery]);
        router[mode](nextQuery ? `${pathname}?${nextQuery}` : pathname, { scroll: false });
    };
    const submitSearch = () => navigate({ keyword: keyword.trim() }, "push");

    useEffect(() => {
        const target = loadMoreRef.current;
        if (!target || !hasNextPage || isPlaceholderData || isFetching || isError) return;

        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) void fetchNextPage();
            },
            { rootMargin: "0px 0px 600px 0px" },
        );
        observer.observe(target);
        return () => observer.disconnect();
    }, [hasNextPage, isPlaceholderData, isFetching, isError, fetchNextPage]);
    return (
        <main className="flex-1 bg-white font-normal tracking-normal">
            <LoginRequiredDialog
                open={interests.loginNoticeOpen}
                onOpenChange={interests.onLoginNoticeOpenChange}
            />
            <InterestAddedDialog
                open={interestDialogOpen}
                onOpenChange={setInterestDialogOpen}
                price={interestDialogPrice}
            />
            <SearchBar keyword={keyword} onKeywordChange={setKeyword} onSearch={submitSearch} />
            <div className="layout-container flex flex-col items-start gap-8 py-[60px] xl:flex-row xl:gap-[60px]">
                <SearchFilters
                    key={filtersKey}
                    filters={filters}
                    onFiltersChange={(nextFilters) => navigate({ filters: nextFilters }, "replace")}
                    keyword={keyword}
                    onKeywordChange={setKeyword}
                    onKeywordSubmit={submitSearch}
                />
                <div className="flex min-w-0 flex-1 flex-col gap-4">
                    {interests.errorMessage && (
                        <div
                            role="alert"
                            className="text-destructive typography-body-small flex items-center gap-3"
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
                        onSortChange={(nextSort) => navigate({ sort: nextSort }, "replace")}
                        keyword={submittedKeyword}
                        products={products}
                        totalCount={data?.pages[0]?.totalCount ?? null}
                        onLike={(product) =>
                            interests.toggle(
                                { source: product.source, targetId: product.id },
                                {
                                    interestId: product.interestId,
                                    // 하트와 함께 바로 띄우고, 등록이 실패하면 닫는다(오류는 위 alert로 표시)
                                    onAdd: () => {
                                        setInterestDialogPrice(product.price);
                                        setInterestDialogOpen(true);
                                    },
                                    onAddFailed: () => setInterestDialogOpen(false),
                                },
                            )
                        }
                        likeDisabled={interests.disabled}
                        isLoading={!isInitialized || isPending}
                        isRefreshing={isPlaceholderData}
                        error={isError ? error : null}
                        onRetry={() => void (isFetchNextPageError ? fetchNextPage() : refetch())}
                        isFetchingNextPage={isFetchingNextPage}
                        hasNextPage={Boolean(hasNextPage) && !isPlaceholderData}
                        loadMoreRef={loadMoreRef}
                    />
                </div>
            </div>
            <ScrollToTopButton onClick={handleScrollToTop} />
        </main>
    );
}
