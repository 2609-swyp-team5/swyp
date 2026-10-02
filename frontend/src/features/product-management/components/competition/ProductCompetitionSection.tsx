"use client";

import type { ProductCompetitionResult } from "../../api/productManagementMockApi";
import type { StreamingQueryState } from "../shared/streaming/productManagementStreamingTypes";
import { ProductCompetitionContent } from "./ProductCompetitionContent";
import { ProductCompetitionSkeleton } from "./ProductCompetitionSkeleton";

export function ProductCompetitionSection({
    query,
}: {
    query: StreamingQueryState<ProductCompetitionResult>;
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
                <ProductCompetitionContent competition={query.data.data.competition} />
            ) : null}
        </section>
    );
}
