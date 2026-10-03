import { useState } from "react";

import { Checkbox } from "@/common/components/ui/Checkbox";
import { Input } from "@/common/components/ui/Input";
import { RadioGroup, RadioGroupItem } from "@/common/components/ui/RadioGroup";
import type { SearchPlatform, SearchStatus } from "@/features/search/types";

const statusOptions = [
    { label: "등록됨", value: "DRAFT" },
    { label: "판매중", value: "ON_SALE" },
    { label: "판매완료", value: "SOLD_OUT" },
] as const;
const fieldsetClass = "flex flex-col gap-3 border-b border-[#dee5ed] pb-6";
const legendClass = "mb-3 text-base leading-[25px] font-semibold tracking-[0.5px]";
const optionClass = "flex items-center gap-2 text-base leading-[25px]";
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
        <fieldset className={fieldsetClass}>
            <legend className={legendClass}>{title}</legend>
            {options.map(({ label }) => (
                <label key={label} className={optionClass}>
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

export function SearchFilters({
    platform,
    onPlatformChange,
    status,
    onStatusChange,
    disabled = false,
}: {
    platform: SearchPlatform;
    onPlatformChange: (platform: SearchPlatform) => void;
    status?: SearchStatus;
    onStatusChange: (status?: SearchStatus) => void;
    disabled?: boolean;
}) {
    const [selectedConditions, setSelectedConditions] = useState<string[]>([]);

    return (
        <aside
            aria-label="검색 필터"
            className="grid w-full shrink-0 gap-6 bg-[#fafbff] px-5 py-[30px] text-[#545d82] sm:grid-cols-2 xl:flex xl:w-[260px] xl:flex-col"
        >
            <FilterGroup
                title="플랫폼"
                options={[{ label: "전체" }, { label: "번개장터" }, { label: "지금이니" }]}
                disabled={disabled}
                value={{ ALL: "전체", BUNJANG: "번개장터", OUR: "지금이니" }[platform]}
                onValueChange={(label) =>
                    onPlatformChange(
                        label === "번개장터" ? "BUNJANG" : label === "지금이니" ? "OUR" : "ALL",
                    )
                }
            />
            <fieldset disabled className={fieldsetClass}>
                <legend className={legendClass}>가격</legend>
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
                <RadioGroup disabled aria-label="가격 범위" name="price-range" className="gap-3">
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
            <fieldset className={fieldsetClass}>
                <legend className={legendClass}>제품 상태</legend>
                {["미개봉", "거의 새 상품", "사용감 적음", "사용감 있음", "수리 필요"].map(
                    (label) => (
                        <label key={label} className={optionClass}>
                            <Checkbox
                                checked={selectedConditions.includes(label)}
                                onCheckedChange={(checked) =>
                                    setSelectedConditions((current) =>
                                        checked
                                            ? [...current, label]
                                            : current.filter((condition) => condition !== label),
                                    )
                                }
                                className="size-[13px] rounded-[2px] border-[#767676] bg-white data-checked:border-[#5d55fe] data-checked:bg-[#5d55fe] data-checked:text-white [&_svg]:size-[11px]"
                            />
                            {label}
                        </label>
                    ),
                )}
            </fieldset>
            <FilterGroup
                title="거래 상태"
                options={statusOptions}
                disabled={disabled}
                value={statusOptions.find((option) => option.value === status)?.label}
                onValueChange={(label) =>
                    onStatusChange(statusOptions.find((option) => option.label === label)?.value)
                }
            />
            <div className="flex flex-col gap-6">
                {status && (
                    <p className="text-xs leading-5 text-[#83889e]">
                        거래 상태를 선택하면 지금이니?! 상품만 표시됩니다.
                    </p>
                )}
                <label className="flex flex-col gap-3 text-base leading-[25px] font-semibold tracking-[0.5px]">
                    포함 키워드
                    <Input disabled placeholder="예: 미개봉, 직거래" className={filterInputClass} />
                </label>
                <label className="flex flex-col gap-3 text-base leading-[25px] font-semibold tracking-[0.5px]">
                    제외 키워드
                    <Input disabled placeholder="예: 부품용, 고장" className={filterInputClass} />
                </label>
            </div>
        </aside>
    );
}
