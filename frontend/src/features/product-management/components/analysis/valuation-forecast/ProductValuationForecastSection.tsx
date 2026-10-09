"use client";

import type { ProductValuationForecast } from "../../../types";
import type { StreamingQueryState } from "../../shared/streaming/productManagementStreamingTypes";
import { ProductValuationForecastChart } from "./ProductValuationForecastChart";
import { ProductValuationForecastSkeleton } from "./ProductValuationForecastSkeleton";

export function ProductValuationForecastSection({
    query,
}: {
    query: StreamingQueryState<ProductValuationForecast>;
}) {
    if (query.isPending) {
        return <ProductValuationForecastSkeleton />;
    }

    if (query.error || !query.data) {
        return (
            <section className="flex h-[320px] min-w-0 items-center justify-center rounded-[10px] border border-[#6653fb] bg-white p-5">
                <p className="text-center text-[14px] leading-6 text-[#d65353]">
                    감가 상각률 데이터를 불러오지 못했습니다.
                </p>
            </section>
        );
    }

    return (
        <section className="h-[320px] min-w-0 rounded-[10px] border border-[#6653fb] bg-white p-5">
            <ProductValuationForecastChart forecast={query.data.valuationForecast} />
        </section>
    );
}
