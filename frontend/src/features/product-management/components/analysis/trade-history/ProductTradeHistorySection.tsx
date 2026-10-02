"use client";

import type { ProductTransactionsResult } from "../../../api/productManagementMockApi";
import { ProductManagementStreamingSection } from "../../shared/streaming/ProductManagementStreamingSection";
import type { StreamingQueryState } from "../../shared/streaming/productManagementStreamingTypes";

export function ProductTradeHistorySection({
    query,
}: {
    query: StreamingQueryState<ProductTransactionsResult>;
}) {
    return (
        <ProductManagementStreamingSection
            step={5}
            title="실거래 데이터"
            query={query}
            getReadyMessage={(result) =>
                `최근 ${result.data.period} 실거래 응답을 받았습니다. ${result.data.transactions.length}개 샘플 · 주요 거래 ${result.data.majorTransactionRange.transactionCount}건`
            }
        />
    );
}
