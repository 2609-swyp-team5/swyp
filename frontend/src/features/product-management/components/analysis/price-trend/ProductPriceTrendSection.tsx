"use client";

import type { ProductPriceTrendResult } from "../../../api/productManagementMockApi";
import { ProductManagementStreamingSection } from "../../shared/streaming/ProductManagementStreamingSection";
import type { StreamingQueryState } from "../../shared/streaming/productManagementStreamingTypes";

export function ProductPriceTrendSection({
    query,
}: {
    query: StreamingQueryState<ProductPriceTrendResult>;
}) {
    return (
        <ProductManagementStreamingSection
            step={3}
            title="상품 시세 추이"
            query={query}
            getReadyMessage={(result) =>
                `최근 1개월 시세 추이 응답을 받았습니다. ${result.data.priceTrend.points.length}개 포인트 · 실제 거래 ${result.data.priceTrend.totalTransactionCount.toLocaleString("ko-KR")}건`
            }
        />
    );
}
