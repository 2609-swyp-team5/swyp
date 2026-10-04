import { useState } from "react";

import { Checkbox } from "@/common/components/ui/Checkbox";
import { Input } from "@/common/components/ui/Input";
import { RadioGroup, RadioGroupItem } from "@/common/components/ui/RadioGroup";
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
const fieldsetClass = "flex flex-col gap-3 border-b border-[#dee5ed] pb-6";
const legendClass = "mb-3 text-base leading-[25px] font-semibold tracking-[0.5px]";
const optionClass = "flex items-center gap-2 text-base leading-[25px]";
const filterInputClass =
    "h-[38px] rounded-md border-[#dee5ed] bg-transparent px-3 py-2 text-xs leading-5 font-normal tracking-[-0.5px] placeholder:text-black/50 md:text-xs dark:bg-transparent";

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

    return (
        <aside
            aria-label="검색 필터"
            className="grid w-full shrink-0 gap-6 bg-[#fafbff] px-5 py-[30px] text-[#545d82] sm:grid-cols-2 xl:flex xl:w-[260px] xl:flex-col"
        >
            <FilterGroup<SearchPlatform>
                title="플랫폼"
                options={[
                    { label: "전체", value: "ALL" },
                    { label: "번개장터", value: "BUNJANG" },
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
                              : (filters.platform ?? []).filter((platform) => platform !== value);
                    onFiltersChange({
                        ...filters,
                        platform: selected.length ? selected : undefined,
                    });
                }}
            />
            <fieldset disabled={disabled} className={fieldsetClass}>
                <legend className={legendClass}>가격</legend>
                <div className="flex items-center gap-2">
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
                    <p role="alert" className="text-destructive text-xs">
                        {priceError}
                    </p>
                )}
                <RadioGroup
                    disabled={disabled}
                    aria-label="가격 범위"
                    name="price-range"
                    className="gap-3"
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
                        onFiltersChange({ ...filters, minPrice: option.min, maxPrice: option.max });
                    }}
                >
                    {priceOptions.map(({ label }) => (
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
                onValueChange={(value, checked) =>
                    onFiltersChange({
                        ...filters,
                        status: checked ? value : undefined,
                    })
                }
            />
            <div className="flex flex-col gap-6">
                {(Array.isArray(filters.status)
                    ? filters.status.includes("DRAFT")
                    : filters.status === "DRAFT") && (
                    <p className="text-xs leading-5 text-[#83889e]">
                        임시저장 상태는 지금이니?! 상품에만 적용됩니다.
                    </p>
                )}
                <label className="flex flex-col gap-3 text-base leading-[25px] font-semibold tracking-[0.5px]">
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
                <label className="flex flex-col gap-3 text-base leading-[25px] font-semibold tracking-[0.5px]">
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
        </aside>
    );
}
