"use client";

import { Button } from "@/common/components/ui/Button";
import { cn } from "@/common/lib/utils";
import type { MyProductFilter } from "@/features/my/types";

const filters = [
    { id: "ALL", label: "전체" },
    { id: "DRAFT", label: "임시저장" },
    { id: "ON_SALE", label: "판매중" },
    { id: "SOLD_OUT", label: "판매완료" },
] as const;

type ProductFiltersProps = {
    filter: MyProductFilter;
    onFilterChange: (filter: MyProductFilter) => void;
    counts: Record<MyProductFilter, number> | undefined;
};

export function ProductFilters({ filter, onFilterChange, counts }: ProductFiltersProps) {
    return (
        <div role="group" aria-label="상품 분류" className="mb-[50px] flex flex-wrap gap-[10px]">
            {filters.map((item) => (
                <Button
                    key={item.id}
                    type="button"
                    variant="outline"
                    aria-pressed={filter === item.id}
                    onClick={() => onFilterChange(item.id)}
                    className={cn(
                        "h-[30px] gap-[3px] rounded-full px-[15px] text-[13px] leading-5 tracking-[-0.5px] focus-visible:!border-[#6653fb] focus-visible:ring-3 focus-visible:!ring-[#6653fb]/30",
                        filter === item.id
                            ? "border-[#5d55fe] bg-[#5d55fe] text-white hover:bg-[#5745e7] hover:text-white dark:hover:bg-[#5745e7]"
                            : "border-[#d3d3d3] bg-white text-[#83889e] hover:border-[#6653fb] hover:bg-[#fafbff] hover:text-[#6653fb] dark:hover:bg-[#fafbff]",
                    )}
                >
                    {item.label}
                    <span>{counts?.[item.id] ?? "—"}</span>
                </Button>
            ))}
        </div>
    );
}
