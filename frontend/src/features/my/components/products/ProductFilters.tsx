"use client";

import { Button } from "@/common/components/ui/Button";
import { cn } from "@/common/lib/utils";

const filters = [
    { id: "all", label: "전체", accessibleLabel: "전체", count: 6 },
    { id: "selling", label: "판매상품", accessibleLabel: "판매 상품", count: 3 },
    { id: "interest", label: "관심상품", accessibleLabel: "관심 상품", count: 2 },
] as const;

export type ProductFilter = (typeof filters)[number]["id"];
type ProductFiltersProps = {
    filter: ProductFilter;
    onFilterChange: (filter: ProductFilter) => void;
};

export function ProductFilters({ filter, onFilterChange }: ProductFiltersProps) {
    return (
        <div
            role="group"
            aria-label="상품 분류"
            className="mb-[50px] flex flex-wrap gap-[10px] pt-[50px]"
        >
            {filters.map((item) => (
                <Button
                    key={item.id}
                    type="button"
                    variant="outline"
                    aria-pressed={filter === item.id}
                    aria-label={`${item.accessibleLabel} ${item.count}`}
                    onClick={() => onFilterChange(item.id)}
                    className={cn(
                        "h-[30px] gap-[3px] rounded-full px-[15px] text-[13px] leading-5 tracking-[-0.5px] focus-visible:!border-[#6653fb] focus-visible:ring-3 focus-visible:!ring-[#6653fb]/30",
                        filter === item.id
                            ? "border-[#5d55fe] bg-[#5d55fe] text-white hover:bg-[#5745e7] hover:text-white dark:hover:bg-[#5745e7]"
                            : "border-[#d3d3d3] bg-white text-[#83889e] hover:border-[#6653fb] hover:bg-[#fafbff] hover:text-[#6653fb] dark:hover:bg-[#fafbff]",
                    )}
                >
                    {item.label}
                    <span>{item.count}</span>
                </Button>
            ))}
        </div>
    );
}
