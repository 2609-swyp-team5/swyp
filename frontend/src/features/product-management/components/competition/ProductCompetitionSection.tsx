"use client";

import type { ProductCompetitionResult } from "../../api/productManagementMockApi";
import { ProductManagementStreamingSection } from "../shared/streaming/ProductManagementStreamingSection";
import type { StreamingQueryState } from "../shared/streaming/productManagementStreamingTypes";

export function ProductCompetitionSection({
    query,
}: {
    query: StreamingQueryState<ProductCompetitionResult>;
}) {
    return (
        <ProductManagementStreamingSection
            step={6}
            title="경쟁 상품"
            query={query}
            getReadyMessage={(result) =>
                `경쟁 상품 응답을 받았습니다. ${result.data.competition.count}건 · 경쟁 정도 ${result.data.competition.levelLabel}`
            }
        />
    );
}
