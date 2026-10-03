"use client";

import type { ProductCompetition } from "../../types";
import type { StreamingQueryState } from "../shared/streaming/productManagementStreamingTypes";
import { ProductCompetitionContent } from "./ProductCompetitionContent";
import { ProductCompetitionSkeleton } from "./ProductCompetitionSkeleton";

export function ProductCompetitionSection({
    query,
    heading,
    showCompetitionMeta,
}: {
    query: StreamingQueryState<ProductCompetition>;
    heading?: string;
    showCompetitionMeta?: boolean;
}) {
    const isError = Boolean(query.error);

    return (
        <section aria-labelledby="product-competition-title" className="overflow-hidden">
            {query.isPending ? (
                <ProductCompetitionSkeleton />
            ) : isError ? (
                <p className="bg-white px-6 py-16 text-center text-[14px] leading-6 text-[#d65353]">
                    경쟁 상품 데이터를 불러오지 못했습니다.
                </p>
            ) : query.data ? (
                <ProductCompetitionContent
                    competition={query.data.competition}
                    heading={heading}
                    showCompetitionMeta={showCompetitionMeta}
                />
            ) : null}
        </section>
    );
}
