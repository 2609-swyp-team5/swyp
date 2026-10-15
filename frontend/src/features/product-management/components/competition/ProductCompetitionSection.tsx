"use client";

import type { ProductCompetition } from "../../types";
import type { StreamingQueryState } from "../shared/streaming/productManagementStreamingTypes";
import { ProductCompetitionContent } from "./ProductCompetitionContent";
import { ProductCompetitionSkeleton } from "./ProductCompetitionSkeleton";

export function ProductCompetitionSection({
    query,
    heading,
    showCompetitionMeta,
    variant,
}: {
    query: StreamingQueryState<ProductCompetition>;
    heading?: string;
    showCompetitionMeta?: boolean;
    variant?: "default" | "management";
}) {
    const isError = Boolean(query.error);
    const hasCompetitionItems = Boolean(query.data?.competition.items.length);
    const shouldShowCompetitionMeta = (showCompetitionMeta ?? true) && hasCompetitionItems;

    return (
        <section aria-labelledby="product-competition-title" className="overflow-hidden">
            {query.isPending ? (
                <ProductCompetitionSkeleton />
            ) : isError ? (
                <p className="typography-body-small bg-white px-6 py-16 text-center text-[#d65353]">
                    경쟁 상품 데이터를 불러오지 못했습니다.
                </p>
            ) : query.data ? (
                <ProductCompetitionContent
                    competition={query.data.competition}
                    heading={heading}
                    showCompetitionMeta={shouldShowCompetitionMeta}
                    variant={variant}
                />
            ) : null}
        </section>
    );
}
