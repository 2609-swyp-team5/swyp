import { useEffect, useId, useState } from "react";
import { ChevronDown, SlidersHorizontal, X } from "lucide-react";

import { Button } from "@/common/components/ui/Button";
import { Checkbox } from "@/common/components/ui/Checkbox";
import { Input } from "@/common/components/ui/Input";
import { RadioGroup, RadioGroupItem } from "@/common/components/ui/RadioGroup";
import { cn } from "@/common/lib/utils";
import type { SearchParams, SearchPlatform, SearchStatus } from "@/features/search/types";

const statusOptions = [
    { label: "임시저장", value: "DRAFT" },
    { label: "판매중", value: "ON_SALE" },
    { label: "예약중", value: "RESERVED" },
    { label: "판매완료", value: "SOLD_OUT" },
] as const;
const conditionOptions = [
    { label: "미개봉", value: "S" },
    { label: "거의 새 상품", value: "A" },
    { label: "사용감 적음", value: "B" },
    { label: "사용감 있음", value: "C" },
    { label: "수리 필요", value: "D" },
] as const;
const priceOptions = [
    { label: "10만 원 이하", min: undefined, max: 100000 },
    { label: "10만~30만 원", min: 100000, max: 300000 },
    { label: "30만~50만 원", min: 300000, max: 500000 },
    { label: "50만 원 이상", min: 500000, max: undefined },
] as const;
const fieldsetClass =
    "grid min-w-0 grid-cols-2 content-start gap-2 border-b border-[#dee5ed] pb-5 xl:flex xl:flex-col xl:gap-3 xl:pb-6";
const legendClass = "mb-3 typography-body-bold font-semibold";
const optionClass =
    "flex min-h-10 cursor-pointer items-center gap-2 rounded-lg border border-[#dee5ed] bg-white px-2.5 py-2 typography-body-medium has-[[aria-checked=true]]:border-[#6653fb] has-[[aria-checked=true]]:bg-[#f0edff] xl:min-h-0 xl:rounded-none xl:border-0 xl:bg-transparent xl:p-0 xl:has-[[aria-checked=true]]:bg-transparent";
const filterInputClass =
    "h-[38px] rounded-md border-[#dee5ed] bg-transparent px-3 py-2 typography-body-small font-normal placeholder:text-black/50 dark:bg-transparent";

function FilterGroup<T extends string>({
    title,
    options,
    disabled = false,
    values,
    onValueChange,
}: {
    title: string;
    options: readonly { label: string; value: T }[];
    disabled?: boolean;
    values: readonly T[];
    onValueChange: (value: T, checked: boolean) => void;
}) {
    return (
        <fieldset className={fieldsetClass}>
            <legend className={legendClass}>{title}</legend>
            {options.map(({ label, value }) => (
                <label key={label} className={optionClass}>
                    <Checkbox
                        checked={values.includes(value)}
                        disabled={disabled}
                        onCheckedChange={(checked) => onValueChange(value, checked === true)}
                        className="size-[13px] rounded-[2px] border-[#767676] bg-white data-checked:border-[#5d55fe] data-checked:bg-[#5d55fe] data-checked:text-white [&_svg]:size-[11px]"
                    />
                    {label}
                </label>
            ))}
        </fieldset>
    );
}

export function SearchFilters({
    filters,
    onFiltersChange,
    keyword,
    onKeywordChange,
    onKeywordSubmit,
    disabled = false,
}: {
    filters: SearchParams;
    onFiltersChange: (filters: SearchParams) => void;
    keyword: string;
    onKeywordChange: (keyword: string) => void;
    onKeywordSubmit: () => void;
    disabled?: boolean;
}) {
    const [isExpanded, setIsExpanded] = useState(false);
    const filterContentId = useId();
    const [minPrice, setMinPrice] = useState(filters.minPrice?.toString() ?? "");
    const [maxPrice, setMaxPrice] = useState(filters.maxPrice?.toString() ?? "");
    const [priceError, setPriceError] = useState("");
    const [excludeKeyword, setExcludeKeyword] = useState(filters.excludeKeyword ?? "");
    const applyPrices = () => {
        const min = minPrice === "" ? undefined : Number(minPrice);
        const max = maxPrice === "" ? undefined : Number(maxPrice);
        if (
            [min, max].some(
                (price) => price !== undefined && (!Number.isSafeInteger(price) || price < 0),
            )
        ) {
            setPriceError("가격은 0 이상의 정수로 입력해 주세요.");
            return;
        }
        if (min !== undefined && max !== undefined && min > max) {
            setPriceError("최대 가격은 최소 가격 이상으로 입력해 주세요.");
            return;
        }
        setPriceError("");
        onFiltersChange({ ...filters, minPrice: min, maxPrice: max });
    };
    const applyExcludeKeyword = () =>
        onFiltersChange({ ...filters, excludeKeyword: excludeKeyword.trim() || undefined });
    const closeFilters = () => setIsExpanded(false);
    const appliedCount =
        (filters.platform?.length ?? 0) +
        (filters.condition?.length ?? 0) +
        (Array.isArray(filters.status) ? filters.status.length : filters.status ? 1 : 0) +
        (filters.minPrice !== undefined || filters.maxPrice !== undefined ? 1 : 0) +
        (filters.excludeKeyword ? 1 : 0);

    // 휴대폰 하단 시트가 열려 있는 동안 뒤 화면이 스크롤되지 않게 하고 Esc로 닫는다.
    useEffect(() => {
        if (!isExpanded || !window.matchMedia("(max-width: 767px)").matches) return;
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape") setIsExpanded(false);
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => {
            document.body.style.overflow = previousOverflow;
            window.removeEventListener("keydown", handleKeyDown);
        };
    }, [isExpanded]);

    return (
        <aside
            aria-label="검색 필터"
            className="w-full min-w-0 shrink-0 rounded-xl border border-[#dee5ed] bg-[#fafbff] text-[#545d82] xl:-mt-[30px] xl:w-[260px] xl:rounded-none xl:border-0"
        >
            <Button
                type="button"
                variant="ghost"
                aria-expanded={isExpanded}
                aria-controls={filterContentId}
                onClick={() => setIsExpanded((expanded) => !expanded)}
                className="typography-body-bold-small h-14 w-full justify-between rounded-xl px-5 font-semibold text-[#545d82] xl:hidden"
            >
                <span className="flex items-center gap-2">
                    <SlidersHorizontal aria-hidden="true" className="size-4" />
                    검색 필터
                </span>
                <span className="typography-body-small flex items-center gap-2 font-normal text-[#83889e]">
                    {appliedCount > 0 ? (
                        <span className="rounded-full bg-[#6653fb] px-2 py-0.5 font-semibold text-white md:hidden">
                            {appliedCount}개 적용
                        </span>
                    ) : null}
                    <span className="hidden md:inline">{isExpanded ? "접기" : "펼치기"}</span>
                    <ChevronDown
                        aria-hidden="true"
                        className={cn("size-4 transition-transform", isExpanded && "rotate-180")}
                    />
                </span>
            </Button>
            {isExpanded ? (
                <div
                    aria-hidden="true"
                    className="fixed inset-0 z-50 bg-black/40 md:hidden"
                    onClick={closeFilters}
                />
            ) : null}
            {/* 휴대폰(<768px)은 아래에서 올라오는 시트, 태블릿은 펼침 영역, 데스크톱은 왼쪽 고정 */}
            <div
                id={filterContentId}
                className={cn(
                    "fixed inset-x-0 bottom-0 z-50 max-h-[85dvh] overflow-y-auto overscroll-contain rounded-t-2xl bg-[#fafbff] px-4 pb-[calc(env(safe-area-inset-bottom)+16px)] md:static md:z-auto md:max-h-none md:overflow-visible md:rounded-none md:border-t md:border-[#dee5ed] md:bg-transparent md:p-5",
                    "gap-5 sm:grid-cols-2 xl:flex xl:flex-col xl:gap-6 xl:border-0 xl:px-5 xl:py-[30px]",
                    isExpanded ? "grid" : "hidden",
                )}
            >
                <div className="sticky top-0 z-10 -mx-4 flex items-center justify-between border-b border-[#dee5ed] bg-[#fafbff] px-4 py-3 sm:col-span-2 md:hidden">
                    <span className="typography-body-bold flex items-center gap-2 font-semibold">
                        <SlidersHorizontal aria-hidden="true" className="size-4" />
                        검색 필터
                    </span>
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label="필터 닫기"
                        onClick={closeFilters}
                        className="size-11 text-[#545d82]"
                    >
                        <X aria-hidden="true" className="size-5" />
                    </Button>
                </div>
                <FilterGroup<SearchPlatform>
                    title="플랫폼"
                    options={[
                        { label: "전체", value: "ALL" },
                        { label: "번개장터", value: "BUNJANG" },
                        { label: "중고나라", value: "JOONGNA" },
                        { label: "지금이니", value: "OUR" },
                    ]}
                    disabled={disabled}
                    values={filters.platform?.length ? filters.platform : ["ALL"]}
                    onValueChange={(value, checked) => {
                        const selected =
                            value === "ALL"
                                ? []
                                : checked
                                  ? [...(filters.platform ?? []), value]
                                  : (filters.platform ?? []).filter(
                                        (platform) => platform !== value,
                                    );
                        onFiltersChange({
                            ...filters,
                            platform: selected.length ? selected : undefined,
                        });
                    }}
                />
                <fieldset disabled={disabled} className={fieldsetClass}>
                    <legend className={legendClass}>가격</legend>
                    <div className="col-span-2 flex min-w-0 items-center gap-2">
                        <Input
                            aria-label="최소 가격"
                            type="number"
                            min={0}
                            value={minPrice}
                            onChange={(event) => setMinPrice(event.target.value)}
                            onBlur={applyPrices}
                            onKeyDown={(event) => {
                                if (event.key === "Enter") applyPrices();
                            }}
                            aria-invalid={Boolean(priceError)}
                            placeholder="최소"
                            className={filterInputClass}
                        />
                        <span className="text-[#8ca2c0]">~</span>
                        <Input
                            aria-label="최대 가격"
                            type="number"
                            min={0}
                            value={maxPrice}
                            onChange={(event) => setMaxPrice(event.target.value)}
                            onBlur={applyPrices}
                            onKeyDown={(event) => {
                                if (event.key === "Enter") applyPrices();
                            }}
                            aria-invalid={Boolean(priceError)}
                            placeholder="최대"
                            className={filterInputClass}
                        />
                    </div>
                    {priceError && (
                        <p role="alert" className="text-destructive typography-body-small">
                            {priceError}
                        </p>
                    )}
                    <RadioGroup
                        disabled={disabled}
                        aria-label="가격 범위"
                        name="price-range"
                        className="col-span-2 grid-cols-2 gap-2 sm:grid-cols-1 lg:grid-cols-2 xl:grid-cols-1 xl:gap-3"
                        value={
                            priceOptions.find(
                                (option) =>
                                    !priceError &&
                                    option.min === filters.minPrice &&
                                    option.max === filters.maxPrice,
                            )?.label ?? ""
                        }
                        onValueChange={(label) => {
                            const option = priceOptions.find((option) => option.label === label);
                            if (!option) return;
                            setMinPrice(option.min?.toString() ?? "");
                            setMaxPrice(option.max?.toString() ?? "");
                            setPriceError("");
                            onFiltersChange({
                                ...filters,
                                minPrice: option.min,
                                maxPrice: option.max,
                            });
                        }}
                    >
                        {priceOptions.map(({ label }) => (
                            <label key={label} className={optionClass}>
                                <RadioGroupItem
                                    value={label}
                                    className="size-[13px] border-[#767676] bg-white data-checked:border-[#5d55fe] data-checked:bg-[#5d55fe] data-checked:text-white [&_[data-slot=radio-group-indicator]]:size-[13px] [&_[data-slot=radio-group-indicator]>span]:bg-white"
                                />
                                {label}
                            </label>
                        ))}
                    </RadioGroup>
                </fieldset>
                <fieldset disabled={disabled} className={fieldsetClass}>
                    <legend className={legendClass}>제품 상태</legend>
                    {conditionOptions.map(({ label, value }) => (
                        <label key={label} className={optionClass}>
                            <Checkbox
                                checked={filters.condition?.includes(value) ?? false}
                                onCheckedChange={(checked) =>
                                    onFiltersChange({
                                        ...filters,
                                        condition: checked
                                            ? [...(filters.condition ?? []), value]
                                            : filters.condition?.filter(
                                                  (condition) => condition !== value,
                                              ),
                                    })
                                }
                                className="size-[13px] rounded-[2px] border-[#767676] bg-white data-checked:border-[#5d55fe] data-checked:bg-[#5d55fe] data-checked:text-white [&_svg]:size-[11px]"
                            />
                            {label}
                        </label>
                    ))}
                </fieldset>
                <FilterGroup<SearchStatus>
                    title="거래 상태"
                    options={statusOptions}
                    disabled={disabled}
                    values={
                        Array.isArray(filters.status)
                            ? filters.status
                            : filters.status
                              ? [filters.status]
                              : []
                    }
                    // 여러 상태를 함께 고를 수 있다(예: 판매중+판매완료로 실제 팔린 가격과 비교)
                    onValueChange={(value, checked) => {
                        const current = filters.status === undefined ? [] : [filters.status].flat();
                        const next = checked
                            ? [...new Set([...current, value])]
                            : current.filter((status) => status !== value);
                        onFiltersChange({ ...filters, status: next.length ? next : undefined });
                    }}
                />
                <div className="grid min-w-0 gap-5 sm:col-span-2 sm:grid-cols-2 xl:flex xl:flex-col xl:gap-6">
                    {(Array.isArray(filters.status)
                        ? filters.status.includes("DRAFT")
                        : filters.status === "DRAFT") && (
                        <p className="typography-body-small text-[#83889e] sm:col-span-2">
                            임시저장 상태는 지금이니?! 상품에만 적용됩니다.
                        </p>
                    )}
                    <label className="typography-body-bold flex flex-col gap-3 font-semibold">
                        포함 키워드
                        <Input
                            disabled={disabled}
                            value={keyword}
                            onChange={(event) => onKeywordChange(event.target.value)}
                            onBlur={onKeywordSubmit}
                            onKeyDown={(event) => {
                                if (event.key === "Enter") onKeywordSubmit();
                            }}
                            placeholder="예: 아이폰 15 프로"
                            className={filterInputClass}
                        />
                    </label>
                    <label className="typography-body-bold flex flex-col gap-3 font-semibold">
                        제외 키워드
                        <Input
                            disabled={disabled}
                            value={excludeKeyword}
                            onChange={(event) => setExcludeKeyword(event.target.value)}
                            onBlur={applyExcludeKeyword}
                            onKeyDown={(event) => {
                                if (event.key === "Enter") applyExcludeKeyword();
                            }}
                            placeholder="예: 부품용, 고장"
                            className={filterInputClass}
                        />
                    </label>
                </div>
                <div className="sticky bottom-0 -mx-4 bg-[#fafbff] px-4 pt-2 sm:col-span-2 md:hidden">
                    <Button
                        type="button"
                        onClick={closeFilters}
                        className="typography-body-bold h-12 w-full rounded-xl font-semibold"
                    >
                        결과 보기
                    </Button>
                </div>
            </div>
        </aside>
    );
}
