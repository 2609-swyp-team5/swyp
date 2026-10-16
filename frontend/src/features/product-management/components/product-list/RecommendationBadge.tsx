import Image from "next/image";

import { cn } from "@/common/lib/utils";
import type { ProductListItemData } from "./productListTypes";

const badgeToneClassNames: Record<ProductListItemData["badgeTone"], string> = {
    primary: "bg-[#6653fb] text-white",
    dark: "bg-[#272727] text-white",
    muted: "bg-[#83889E] text-white",
    warning: "bg-[#fa503d] text-white",
};

type RecommendationBadgeProps = Pick<ProductListItemData, "badgeLabel" | "badgeTone">;

export function RecommendationBadge({ badgeLabel, badgeTone }: RecommendationBadgeProps) {
    if (!badgeLabel) {
        return <span className="h-5 w-14" aria-hidden="true" />;
    }

    const badgeClassName = cn(
        "inline-flex h-5 w-14 items-center justify-center rounded-full",
        badgeToneClassNames[badgeTone],
    );

    if (badgeLabel === "PENDING") {
        return (
            <span className={badgeClassName}>
                <Image src="/sell/actions/pending.svg" alt="분석 대기" width={22} height={5} />
            </span>
        );
    }

    return (
        <span
            className={cn(
                badgeClassName,
                "leading-5 font-semibold tracking-[-0.5px]",
                badgeTone === "muted" ? "typography-caption" : "typography-body-small",
            )}
        >
            {badgeLabel}
        </span>
    );
}
