import Image from "next/image";

import { cn } from "@/common/lib/utils";
import type { ProductListItemData } from "./productListTypes";

const priceFormatter = new Intl.NumberFormat("ko-KR");

const badgeToneClassNames: Record<ProductListItemData["badgeTone"], string> = {
    primary: "bg-[#6653fb] text-white",
    dark: "bg-[#272727] text-white",
    muted: "bg-[#83889E] text-white",
    warning: "bg-[#fa503d] text-white",
};

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
                {item.badgeLabel === "PENDING" ? (
                    <span
                        className={cn(
                            "inline-flex h-5 w-14 items-center justify-center rounded-full",
                            badgeToneClassNames[item.badgeTone],
                        )}
                    >
                        <Image
                            src="/sell/actions/pending.svg"
                            alt="분석 대기"
                            width={22}
                            height={5}
                        />
                    </span>
                ) : item.badgeLabel ? (
                    <span
                        className={cn(
                            "inline-flex h-5 w-14 items-center justify-center rounded-full leading-5 font-semibold tracking-[-0.5px]",
                            item.badgeTone === "muted"
                                ? "typography-caption"
                                : "typography-body-small",
                            badgeToneClassNames[item.badgeTone],
                        )}
                    >
                        {item.badgeLabel}
                    </span>
                ) : (
                    <span className="h-5 w-14" aria-hidden="true" />
                )}
                <span className="typography-caption min-w-max text-center whitespace-nowrap text-[#6b6c7b]">
                    {item.metaLabel}
                </span>
            </div>
        </button>
    );
}
