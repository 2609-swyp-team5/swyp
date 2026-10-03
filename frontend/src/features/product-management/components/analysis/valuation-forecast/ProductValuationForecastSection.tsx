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
            <div className="flex flex-col gap-[10px]">
                <h3 className="text-[16px] leading-[25px] font-semibold tracking-[0.5px] text-[#6653fb]">
                    감가 상각률
                </h3>
                <section className="flex min-h-[320px] items-center justify-center rounded-[10px] border border-[#d3d3d3] bg-white p-6">
                    <p className="text-center text-[14px] leading-6 text-[#d65353]">
                        감가 상각률 데이터를 불러오지 못했습니다.
                    </p>
                </section>
            </div>
        );
    }

    return (
        <div className="flex min-w-0 flex-col gap-[10px]">
            <h3 className="text-[16px] leading-[25px] font-semibold tracking-[0.5px] text-[#6653fb]">
                감가 상각률
            </h3>
            <section className="min-h-[320px] min-w-0 rounded-[10px] border border-[#d3d3d3] bg-white px-5 py-[22px]">
                <ProductValuationForecastChart forecast={query.data.valuationForecast} />
            </section>
        </div>
    );
}
