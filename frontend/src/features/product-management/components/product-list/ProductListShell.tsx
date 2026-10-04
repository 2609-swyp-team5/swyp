"use client";

import Link from "next/link";
import { Plus } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { Button } from "@/common/components/ui/Button";
import { cn } from "@/common/lib/utils";
import { persistSelectedProductId, useSelectedProductId } from "../../hooks/useSelectedProductId";
import { ProductListItem } from "./ProductListItem";
import { ProductListSkeleton } from "./ProductListSkeleton";
import type { ProductListShellProps } from "./productListTypes";

export function ProductListShell({
    eyebrow,
    title,
    tabs,
    items,
    activeTabKey: controlledActiveTabKey,
    onTabChange,
    totalCount,
    statusCounts,
    isLoading,
    errorMessage,
    hasNextPage = false,
    isFetchingNextPage = false,
    isFetchNextPageError = false,
    onLoadMore,
    onRetryLoadMore,
    emptyMessage,
    listTitle,
    detailRenderer,
    primaryAction,
}: ProductListShellProps) {
    const [uncontrolledActiveTabKey, setUncontrolledActiveTabKey] = useState(tabs[0]?.key ?? "all");
    const activeTabKey = controlledActiveTabKey ?? uncontrolledActiveTabKey;
    const selectedItemId = useSelectedProductId();
    const activeTab = tabs.find((tab) => tab.key === activeTabKey) ?? tabs[0];
    const listScrollRef = useRef<HTMLDivElement>(null);
    const loadMoreRef = useRef<HTMLDivElement>(null);
    const filteredItems = useMemo(
        () => (activeTab ? items.filter(activeTab.filter) : items),
        [activeTab, items],
    );
    const activeListTitle = activeTab?.listTitle ?? listTitle;
    const selectedItem = filteredItems.find((item) => item.id === selectedItemId) ?? null;
    const serverTotalCount = statusCounts
        ? Object.values(statusCounts).reduce((sum, count) => sum + count, 0)
        : totalCount;
    const getTabCount = (tab: (typeof tabs)[number]) => {
        const serverCount =
            tab.countKey === "total"
                ? serverTotalCount
                : tab.countKey
                  ? (statusCounts?.[tab.countKey] ?? null)
                  : null;

        return serverCount ?? items.filter(tab.filter).length;
    };
    const activeListCount = activeTab ? getTabCount(activeTab) : filteredItems.length;

    useEffect(() => {
        const root = listScrollRef.current;
        const target = loadMoreRef.current;
        if (
            !root ||
            !target ||
            !hasNextPage ||
            !onLoadMore ||
            isFetchingNextPage ||
            isFetchNextPageError ||
            errorMessage
        ) {
            return;
        }

        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    onLoadMore();
                }
            },
            { root, rootMargin: "0px 0px 160px 0px" },
        );
        observer.observe(target);

        return () => observer.disconnect();
    }, [errorMessage, hasNextPage, isFetchNextPageError, isFetchingNextPage, onLoadMore]);

    return (
        <main className="flex flex-1 bg-white">
            <section className="layout-container flex flex-col gap-12 pt-16 pb-24">
                <div className="flex flex-col items-start justify-between gap-8 md:flex-row md:items-end">
                    <div className="flex flex-col gap-1">
                        <p className="text-[20px] leading-[30px] font-semibold tracking-[0.5px] text-[#6b6c7b]">
                            {eyebrow}
                        </p>
                        <h1 className="text-[40px] leading-[52px] font-bold tracking-[0.5px] text-[#363636] md:text-[60px] md:leading-[75px]">
                            {title}
                        </h1>
                    </div>
                    {primaryAction ? (
                        <Button
                            asChild
                            className="h-[50px] w-[200px] gap-[10px] rounded-full bg-[#5d55fe] px-8 text-[20px] font-semibold tracking-[0.5px] hover:bg-[#5148ed]"
                        >
                            <Link href={primaryAction.href}>
                                <Plus aria-hidden="true" className="size-[19px]" />
                                {primaryAction.label}
                            </Link>
                        </Button>
                    ) : null}
                </div>

                <div className="overflow-x-auto border-b border-[#dee5ed]">
                    <div
                        role="tablist"
                        aria-label={`${title} 필터`}
                        className="flex min-w-max items-stretch gap-[39px]"
                    >
                        {tabs.map((tab) => {
                            const isActive = tab.key === activeTabKey;
                            const count = getTabCount(tab);

                            return (
                                <button
                                    key={tab.key}
                                    type="button"
                                    role="tab"
                                    aria-selected={isActive}
                                    className={cn(
                                        "flex h-[46px] w-[100px] shrink-0 items-center justify-center border-b-2 whitespace-nowrap transition-colors",
                                        isActive
                                            ? "border-[#363636] text-[#363636]"
                                            : "border-transparent text-[#83889e] hover:text-[#363636]",
                                    )}
                                    onClick={() => {
                                        setUncontrolledActiveTabKey(tab.key);
                                        onTabChange?.(tab.key);
                                    }}
                                >
                                    {isActive ? (
                                        <span className="flex items-center gap-1 tracking-[0.5px]">
                                            <span className="text-[20px] leading-[30px] font-semibold">
                                                {tab.label}
                                            </span>
                                            <span className="inline-flex size-[30px] items-center justify-center rounded-full bg-[#363636] text-[20px] leading-[30px] font-semibold text-white">
                                                {count}
                                            </span>
                                        </span>
                                    ) : (
                                        <span className="text-[16px] leading-[25px] font-normal">
                                            {tab.label} {count}
                                        </span>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>

                <div className="grid items-start gap-8 lg:grid-cols-[350px_minmax(0,1fr)] lg:gap-10">
                    <aside className="h-fit overflow-hidden rounded-[20px] border border-[#d3d3d3] bg-white px-5 py-[30px]">
                        <div>
                            <p className="text-[20px] leading-[30px] font-semibold text-[#6b6c7b]">
                                {activeListCount}건
                            </p>
                            <h2 className="text-[30px] leading-[42px] font-bold text-[#363636]">
                                {activeListTitle}
                            </h2>
                        </div>
                        <div
                            ref={listScrollRef}
                            className="mt-[30px] max-h-[600px] overflow-y-auto"
                        >
                            {isLoading ? <ProductListSkeleton /> : null}
                            {!isLoading && errorMessage ? (
                                <div className="px-5 py-12 text-center text-[14px] leading-5 font-medium text-[#d65353]">
                                    {errorMessage}
                                </div>
                            ) : null}
                            {!isLoading && !errorMessage && filteredItems.length === 0 ? (
                                <div className="px-5 py-14 text-center text-[14px] leading-6 font-medium text-[#83889e]">
                                    {emptyMessage}
                                </div>
                            ) : null}
                            {!isLoading && !errorMessage && filteredItems.length > 0 ? (
                                <div>
                                    {filteredItems.map((item) => (
                                        <ProductListItem
                                            key={item.id}
                                            item={item}
                                            isSelected={item.id === selectedItemId}
                                            onSelect={() => {
                                                persistSelectedProductId(item.id);
                                            }}
                                        />
                                    ))}
                                </div>
                            ) : null}
                            {hasNextPage && !errorMessage ? (
                                <div ref={loadMoreRef} className="min-h-5" aria-hidden="true" />
                            ) : null}
                            {isFetchingNextPage ? (
                                <p
                                    role="status"
                                    className="px-3 py-3 text-center text-[13px] text-[#83889e]"
                                >
                                    상품을 더 불러오는 중입니다.
                                </p>
                            ) : null}
                            {isFetchNextPageError ? (
                                <div className="flex flex-col items-center gap-2 px-3 py-3 text-center">
                                    <p role="alert" className="text-[13px] text-[#d65353]">
                                        상품을 더 불러오지 못했습니다.
                                    </p>
                                    {onRetryLoadMore ? (
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={onRetryLoadMore}
                                        >
                                            다시 시도
                                        </Button>
                                    ) : null}
                                </div>
                            ) : null}
                        </div>
                    </aside>

                    {selectedItem && detailRenderer ? (
                        detailRenderer(selectedItem)
                    ) : (
                        <section className="flex min-h-[430px] items-center justify-center rounded-[14px] border border-dashed border-[#d3d3d3] bg-[#fafbff] px-6 py-16 text-center">
                            <div className="flex max-w-[360px] flex-col items-center gap-3">
                                <div className="flex size-12 items-center justify-center rounded-full bg-[#eaeafd] text-[#6653fb]">
                                    <span aria-hidden="true" className="text-xl">
                                        ✦
                                    </span>
                                </div>
                                <h2 className="text-[20px] leading-[30px] font-bold text-[#363636]">
                                    상품을 선택해 주세요
                                </h2>
                                <p className="text-[14px] leading-6 text-[#83889e]">
                                    목록에서 상품을 선택하면 상품 정보와 시세 분석을 확인할 수
                                    있어요.
                                </p>
                            </div>
                        </section>
                    )}
                </div>
            </section>
        </main>
    );
}
