"use client";

import type { ProductValuationForecastResult } from "../../../api/productManagementMockApi";
import { ProductManagementStreamingSection } from "../../shared/streaming/ProductManagementStreamingSection";
import type { StreamingQueryState } from "../../shared/streaming/productManagementStreamingTypes";

export function ProductValuationForecastSection({
    query,
}: {
    query: StreamingQueryState<ProductValuationForecastResult>;
}) {
    return (
        <ProductManagementStreamingSection
            step={4}
            title="감가 예측"
            query={query}
            getReadyMessage={(result) =>
                `감가 예측 응답을 받았습니다. ${result.data.valuationForecast.forecasts.length}개 기간의 예측값을 표시할 수 있습니다.`
            }
        />
    );
}
