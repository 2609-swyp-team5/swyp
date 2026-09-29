"use client";

import { Search } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { Button } from "@/common/components/ui/Button";
import { Checkbox } from "@/common/components/ui/Checkbox";
import { Input } from "@/common/components/ui/Input";
import { Pagination } from "@/common/components/ui/Pagination";
import { RadioGroup, RadioGroupItem } from "@/common/components/ui/RadioGroup";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/common/components/ui/Select";
import { getApiErrorMessage } from "@/common/lib/api/error";
import { useAuthStore } from "@/features/auth/store/authStore";
import { SearchResultCard } from "@/features/search/components/SearchResultCard";
import { useSearchQuery } from "@/features/search/hooks/queries/useSearchQuery";
import type { SearchStatus } from "@/features/search/types";

const statusOptions = [
    { label: "판매중", value: "ON_SALE" },
    { label: "예약중", value: "RESERVED" },
    { label: "판매완료", value: "SOLD_OUT" },
] as const;
const filterInputClass =
    "h-[38px] rounded-md border-[#dee5ed] bg-transparent px-3 py-2 text-xs leading-5 font-normal tracking-[-0.5px] placeholder:text-black/50 md:text-xs dark:bg-transparent";

function FilterGroup({
    title,
    options,
    disabled = false,
    value,
    onValueChange,
}: {
    title: string;
    options: readonly { label: string }[];
    disabled?: boolean;
    value?: string;
    onValueChange?: (value: string | undefined) => void;
}) {
    return (
        <fieldset className="flex flex-col gap-3 border-b border-[#dee5ed] pb-6">
            <legend className="mb-3 text-base leading-[25px] font-semibold tracking-[0.5px]">
                {title}
            </legend>
            {options.map(({ label }) => (
                <label key={label} className="flex items-center gap-2 text-base leading-[25px]">
                    <Checkbox
                        checked={onValueChange ? value === label : label === "전체"}
                        disabled={disabled}
                        onCheckedChange={(checked) => onValueChange?.(checked ? label : undefined)}
                        className="size-[13px] rounded-[2px] border-[#767676] bg-white data-checked:border-[#5d55fe] data-checked:bg-[#5d55fe] data-checked:text-white [&_svg]:size-[11px]"
                    />
                    {label}
                </label>
            ))}
        </fieldset>
    );
}

export default function SearchPage() {
    const [keyword, setKeyword] = useState("");
    const [submittedKeyword, setSubmittedKeyword] = useState("");
    const [status, setStatus] = useState<SearchStatus>();
    const [liked, setLiked] = useState<Record<string, boolean>>({});
    const [page, setPage] = useState(1);
    const [cursors, setCursors] = useState<(number | undefined)[]>([undefined]);
    const isInitialized = useAuthStore((state) => state.isInitialized);
    const isLoggedIn = useAuthStore((state) => state.isLoggedIn);
    const { data, isPending, isFetching, isError, error, refetch } = useSearchQuery({
        keyword: submittedKeyword || undefined,
        status,
        cursor: cursors[page - 1],
        size: 9,
    });
    const products = data?.content ?? [];
    const totalPages = cursors.length + (page === cursors.length && data?.hasNext ? 1 : 0);
    const resetPage = () => {
        setPage(1);
        setCursors([undefined]);
    };
    const changePage = (nextPage: number) => {
        if (nextPage > cursors.length) {
            const nextCursor = data?.nextCursor;
            if (!data?.hasNext || nextCursor === null || nextCursor === undefined) return;
            setCursors((current) => [...current, nextCursor]);
        }
        setPage(nextPage);
    };

    return (
        <main className="flex-1 bg-white font-normal tracking-normal">
            <div className="border-b border-[#dee5ed] py-5">
                <div className="layout-container">
                    <form
                        role="search"
                        className="flex max-w-[1146px] items-center gap-3"
                        onSubmit={(event) => {
                            event.preventDefault();
                            setSubmittedKeyword(keyword.trim());
                            resetPage();
                        }}
                    >
                        <div className="flex min-w-0 flex-1 items-center gap-3 rounded-full border-[1.5px] border-[#dedee6] bg-[#fafbff] px-5 py-3">
                            <Search
                                aria-hidden="true"
                                className="size-[22px] shrink-0 text-[#83889e]"
                                strokeWidth={1.5}
                            />
                            <Input
                                aria-label="상품 검색"
                                placeholder="상품을 검색해 보세요"
                                value={keyword}
                                onChange={(event) => setKeyword(event.target.value)}
                                className="h-[25px] rounded-none border-0 p-0 text-base leading-[25px] text-[#83889e] focus-visible:ring-0 md:text-base dark:bg-transparent"
                            />
                        </div>
                        <Button
                            type="submit"
                            className="h-11 rounded-full bg-[#5d55fe] px-[30px] text-[13px] leading-5 font-semibold tracking-[-0.5px] text-white hover:bg-[#5148ed]"
                        >
                            검색
                        </Button>
                    </form>
                </div>
            </div>

            <div className="layout-container flex flex-col items-start gap-8 py-[60px] xl:flex-row xl:gap-[60px]">
                <aside
                    aria-label="검색 필터"
                    className="grid w-full shrink-0 gap-6 bg-[#fafbff] px-5 py-[30px] text-[#545d82] sm:grid-cols-2 xl:flex xl:w-[260px] xl:flex-col"
                >
                    <FilterGroup
                        title="플랫폼"
                        disabled
                        options={[
                            { label: "전체" },
                            { label: "당근마켓" },
                            { label: "번개장터" },
                            { label: "중고나라" },
                        ]}
                    />
                    <fieldset
                        disabled
                        className="flex flex-col gap-3 border-b border-[#dee5ed] pb-6"
                    >
                        <legend className="mb-3 text-base leading-[25px] font-semibold tracking-[0.5px]">
                            가격
                        </legend>
                        <div className="flex items-center gap-2">
                            <Input
                                aria-label="최소 가격"
                                type="number"
                                min={0}
                                placeholder="최소"
                                className={filterInputClass}
                            />
                            <span className="text-[#8ca2c0]">~</span>
                            <Input
                                aria-label="최대 가격"
                                type="number"
                                min={0}
                                placeholder="최대"
                                className={filterInputClass}
                            />
                        </div>
                        <RadioGroup
                            disabled
                            aria-label="가격 범위"
                            name="price-range"
                            className="gap-3"
                        >
                            {["10만 원 이하", "10만~30만 원", "30만~50만 원", "50만 원 이상"].map(
                                (label) => (
                                    <label
                                        key={label}
                                        className="flex cursor-pointer items-center gap-2 text-base leading-[25px]"
                                    >
                                        <RadioGroupItem
                                            value={label}
                                            className="size-[13px] border-[#767676] bg-white data-checked:border-[#5d55fe] data-checked:bg-[#5d55fe] data-checked:text-white [&_[data-slot=radio-group-indicator]]:size-[13px] [&_[data-slot=radio-group-indicator]>span]:bg-white"
                                        />
                                        {label}
                                    </label>
                                ),
                            )}
                        </RadioGroup>
                    </fieldset>
                    <FilterGroup
                        title="제품 상태"
                        disabled
                        options={[
                            "미개봉",
                            "거의 새 상품",
                            "사용감 적음",
                            "사용감 있음",
                            "수리 필요",
                        ].map((label) => ({ label }))}
                    />
                    <FilterGroup
                        title="거래 상태"
                        options={statusOptions}
                        disabled={!isLoggedIn}
                        value={statusOptions.find((option) => option.value === status)?.label}
                        onValueChange={(label) => {
                            setStatus(
                                statusOptions.find((option) => option.label === label)?.value,
                            );
                            resetPage();
                        }}
                    />
                    <div className="flex flex-col gap-6">
                        {status && (
                            <p className="text-xs leading-5 text-[#83889e]">
                                거래 상태를 선택하면 지금이니?! 상품만 표시됩니다.
                            </p>
                        )}
                        <label className="flex flex-col gap-3 text-base leading-[25px] font-semibold tracking-[0.5px]">
                            포함 키워드
                            <Input
                                disabled
                                placeholder="예: 미개봉, 직거래"
                                className={filterInputClass}
                            />
                        </label>
                        <label className="flex flex-col gap-3 text-base leading-[25px] font-semibold tracking-[0.5px]">
                            제외 키워드
                            <Input
                                disabled
                                placeholder="예: 부품용, 고장"
                                className={filterInputClass}
                            />
                        </label>
                    </div>
                    <p className="text-xs leading-5 text-[#83889e]">
                        추가 필터와 정렬은 준비 중입니다.
                    </p>
                </aside>

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
                                {submittedKeyword ? "'" + submittedKeyword + "'" : "전체 상품"}
                            </h1>
                            <p className="text-[#6b7395]">
                                {isLoggedIn && data ? products.length + "개 표시" : "상품 검색"}
                            </p>
                        </div>
                        <Select defaultValue="newest">
                            <SelectTrigger
                                aria-label="검색 결과 정렬"
                                className="shrink-0 gap-6 border-[#dedee6] bg-white px-2.5 py-[5px] text-[13px] leading-5 font-semibold tracking-[-0.5px] text-[#83889e] dark:bg-white dark:hover:bg-white [&>svg]:h-2 [&>svg]:w-3 [&>svg]:text-[#83889e]"
                            >
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem disabled value="recommended">
                                    AI 추천순
                                </SelectItem>
                                <SelectItem value="newest">최신순</SelectItem>
                                <SelectItem disabled value="price-asc">
                                    낮은 가격순
                                </SelectItem>
                                <SelectItem disabled value="price-desc">
                                    높은 가격순
                                </SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {!isInitialized || (isLoggedIn && isPending) ? (
                        <p role="status" className="text-base text-[#83889e]">
                            상품을 불러오는 중입니다.
                        </p>
                    ) : !isLoggedIn ? (
                        <div className="flex flex-col items-start gap-4">
                            <p className="text-base text-[#83889e]">
                                로그인 후 상품을 조회할 수 있습니다.
                            </p>
                            <Button asChild>
                                <Link href="/login">로그인</Link>
                            </Button>
                        </div>
                    ) : isError ? (
                        <div className="flex flex-col items-start gap-4">
                            <p role="alert" className="text-base text-[#fa503d]">
                                {getApiErrorMessage(error)}
                            </p>
                            <Button
                                type="button"
                                variant="outline"
                                disabled={isFetching}
                                onClick={() => void refetch()}
                            >
                                다시 시도
                            </Button>
                        </div>
                    ) : products.length === 0 ? (
                        <p role="status" className="text-base text-[#83889e]">
                            검색 결과가 없습니다.
                        </p>
                    ) : (
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                            {products.map((product) => {
                                const key = product.source + ":" + product.id;
                                return (
                                    <SearchResultCard
                                        key={key}
                                        product={product}
                                        liked={Boolean(liked[key])}
                                        onLike={() =>
                                            setLiked((current) => ({
                                                ...current,
                                                [key]: !current[key],
                                            }))
                                        }
                                    />
                                );
                            })}
                        </div>
                    )}

                    {isLoggedIn && (products.length > 0 || cursors.length > 1) && (
                        <Pagination
                            aria-label="검색 결과 페이지"
                            page={page}
                            totalPages={totalPages}
                            disabled={isFetching}
                            onPageChange={changePage}
                        />
                    )}
                </section>
            </div>
        </main>
    );
}
