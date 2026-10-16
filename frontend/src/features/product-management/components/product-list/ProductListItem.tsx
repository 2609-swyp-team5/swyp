import { cn } from "@/common/lib/utils";
import type { ProductListItemData } from "./productListTypes";
import { RecommendationBadge } from "./RecommendationBadge";

const priceFormatter = new Intl.NumberFormat("ko-KR");

type ProductListItemProps = {
    item: ProductListItemData;
    isSelected: boolean;
    onSelect: () => void;
};

export function ProductListItem({ item, isSelected, onSelect }: ProductListItemProps) {
    return (
        <button
            type="button"
            aria-pressed={isSelected}
            aria-current={isSelected ? "true" : undefined}
            className={cn(
                "flex h-[100px] w-full items-center gap-3 border-b border-[#d3d3d3] px-3 py-3 text-left transition-colors last:border-b-0 hover:bg-[#faf9ff] focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-[#6653fb] focus-visible:ring-inset",
                isSelected && "bg-[#f1f1f1] hover:bg-[#f1f1f1]",
            )}
            onClick={onSelect}
        >
            <div className="flex min-w-0 flex-1 flex-col">
                <p className="typography-body-bold truncate font-semibold text-[#374151]">
                    {item.title}
                </p>
                <p className="typography-caption truncate text-[#9aa0b0]">
                    등록가 {priceFormatter.format(item.price)}원
                </p>
            </div>
            <div className="flex w-14 shrink-0 flex-col items-center gap-[5px]">
                <RecommendationBadge badgeLabel={item.badgeLabel} badgeTone={item.badgeTone} />
                <span className="typography-caption min-w-max text-center whitespace-nowrap text-[#6b6c7b]">
                    {item.metaLabel}
                </span>
            </div>
        </button>
    );
}
