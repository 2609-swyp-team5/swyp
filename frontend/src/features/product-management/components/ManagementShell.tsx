"use client";

import Link from "next/link";
import { Plus } from "lucide-react";
import { useMemo, useState, useSyncExternalStore, type ReactNode } from "react";

import { Button } from "@/common/components/ui/Button";
import { cn } from "@/common/lib/utils";

export type ManagementItem = {
    id: string;
    title: string;
    price: number;
    categoryName: string;
    thumbnailUrl: string | null;
    badgeLabel: string | null;
    badgeTone: "primary" | "dark" | "muted" | "warning";
    metaLabel: string;
};

export type ManagementTab = {
    key: string;
    label: string;
    listTitle?: string;
    filter: (item: ManagementItem) => boolean;
};

export type ManagementShellProps = {
    eyebrow: string;
    title: string;
    tabs: ManagementTab[];
    items: ManagementItem[];
    isLoading: boolean;
    errorMessage?: string;
    emptyMessage: string;
    listTitle: string;
    detailRenderer?: (item: ManagementItem) => ReactNode;
    primaryAction?: {
        label: string;
        href: string;
    };
};

const priceFormatter = new Intl.NumberFormat("ko-KR");

const badgeToneClassNames: Record<ManagementItem["badgeTone"], string> = {
    primary: "bg-[#6653fb] text-white",
    dark: "bg-[#272727] text-white",
    muted: "bg-[#83889e] text-white",
    warning: "bg-[#fa503d] text-white",
};

function subscribeToLocation(onStoreChange: () => void) {
    if (typeof window === "undefined") {
        return () => undefined;
    }

    window.addEventListener("popstate", onStoreChange);
    return () => window.removeEventListener("popstate", onStoreChange);
}

function getSelectedItemIdSnapshot() {
    if (typeof window === "undefined") {
        return null;
    }

    return new URLSearchParams(window.location.search).get("selected");
}

function persistSelectedItemId(itemId: string) {
    const params = new URLSearchParams(window.location.search);
    params.set("selected", itemId);
    const query = params.toString();
    window.history.replaceState(
        window.history.state,
        "",
        `${window.location.pathname}${query ? `?${query}` : ""}${window.location.hash}`,
    );
    window.dispatchEvent(new PopStateEvent("popstate"));
}

function ManagementListItem({
    item,
    isSelected,
    onSelect,
}: {
    item: ManagementItem;
    isSelected: boolean;
    onSelect: () => void;
}) {
    return (
        <button
            type="button"
            aria-pressed={isSelected}
            className={cn(
                "flex h-[100px] w-full items-center gap-3 border-b border-[#d3d3d3] px-3 py-3 text-left transition-colors last:border-b-0 hover:bg-[#faf9ff] focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-[#6653fb] focus-visible:ring-inset",
                isSelected && "bg-[#f1f1f1] hover:bg-[#f1f1f1]",
            )}
            onClick={onSelect}
        >
            <div className="flex min-w-0 flex-1 flex-col">
                <p className="truncate text-[16px] leading-[25px] font-semibold tracking-[0.5px] text-[#374151]">
                    {item.title}
                </p>
                <p className="truncate text-[10px] leading-[15px] tracking-[-0.5px] text-[#9aa0b0]">
                    등록가 {priceFormatter.format(item.price)}원
                </p>
            </div>
            <div className="flex w-14 shrink-0 flex-col items-center gap-[5px]">
                {item.badgeLabel ? (
                    <span
                        className={cn(
                            "inline-flex h-5 w-14 items-center justify-center rounded-full text-[13px] leading-5 font-semibold tracking-[-0.5px]",
                            badgeToneClassNames[item.badgeTone],
                        )}
                    >
                        {item.badgeLabel}
                    </span>
                ) : (
                    <span className="h-5 w-14" aria-hidden="true" />
                )}
                <span className="min-w-max text-center text-[10px] leading-[15px] tracking-[-0.5px] whitespace-nowrap text-[#6b6c7b]">
                    {item.metaLabel}
                </span>
            </div>
        </button>
    );
}

function ListSkeleton() {
    return (
        <div aria-label="상품 목록을 불러오는 중">
            {Array.from({ length: 6 }, (_, index) => (
                <div
                    key={index}
                    className="flex h-[100px] items-center gap-3 border-b border-[#d3d3d3] px-3 py-3 last:border-b-0"
                >
                    <div className="flex min-w-0 flex-1 flex-col gap-2">
                        <div className="h-4 w-3/4 animate-pulse rounded bg-[#eef0f5]" />
                        <div className="h-2 w-1/2 animate-pulse rounded bg-[#f4f5f8]" />
                    </div>
                    <div className="flex w-14 flex-col gap-[5px]">
                        <div className="h-5 w-14 animate-pulse rounded-full bg-[#eef0f5]" />
                        <div className="h-2 w-14 animate-pulse rounded bg-[#f4f5f8]" />
                    </div>
                </div>
            ))}
        </div>
    );
}

function DetailSkeleton() {
    return (
        <section
            aria-label="상품 상세 정보를 불러오는 중"
            className="grid min-h-[430px] animate-pulse gap-6 rounded-[16px] border border-[#dee5ed] bg-white p-5 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]"
        >
            <div className="min-h-[260px] rounded-[10px] bg-[#eef0f5]" />
            <div className="flex flex-col gap-4 py-2">
                <div className="h-6 w-24 rounded-full bg-[#eef0f5]" />
                <div className="h-8 w-4/5 rounded bg-[#eef0f5]" />
                <div className="h-8 w-2/5 rounded bg-[#eef0f5]" />
                <div className="mt-3 flex gap-2">
                    <div className="h-9 w-28 rounded-full bg-[#f4f5f8]" />
                    <div className="h-9 w-24 rounded-full bg-[#f4f5f8]" />
                </div>
            </div>
        </section>
    );
}

export function ManagementShell({
    eyebrow,
    title,
    tabs,
    items,
    isLoading,
    errorMessage,
    emptyMessage,
    listTitle,
    detailRenderer,
    primaryAction,
}: ManagementShellProps) {
    const [activeTabKey, setActiveTabKey] = useState(tabs[0]?.key ?? "all");
    const selectedItemId = useSyncExternalStore(
        subscribeToLocation,
        getSelectedItemIdSnapshot,
        () => null,
    );
    const activeTab = tabs.find((tab) => tab.key === activeTabKey) ?? tabs[0];
    const filteredItems = useMemo(
        () => (activeTab ? items.filter(activeTab.filter) : items),
        [activeTab, items],
    );
    const activeListTitle = activeTab?.listTitle ?? listTitle;
    const selectedItem = filteredItems.find((item) => item.id === selectedItemId) ?? null;

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
                            const count = items.filter(tab.filter).length;

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
                                    onClick={() => setActiveTabKey(tab.key)}
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
                                {filteredItems.length}건
                            </p>
                            <h2 className="text-[30px] leading-[42px] font-bold text-[#363636]">
                                {activeListTitle}
                            </h2>
                        </div>
                        <div className="mt-[30px] max-h-[600px] overflow-y-auto">
                            {isLoading ? <ListSkeleton /> : null}
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
                                        <ManagementListItem
                                            key={item.id}
                                            item={item}
                                            isSelected={item.id === selectedItemId}
                                            onSelect={() => {
                                                persistSelectedItemId(item.id);
                                            }}
                                        />
                                    ))}
                                </div>
                            ) : null}
                        </div>
                    </aside>

                    {isLoading && detailRenderer ? (
                        <DetailSkeleton />
                    ) : selectedItem && detailRenderer ? (
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
