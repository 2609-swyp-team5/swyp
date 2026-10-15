"use client";

import type { StreamingQueryState } from "../../shared/streaming/productManagementStreamingTypes";
import type { ProductValuationForecast } from "../../../types";
import { toValuationForecastChartData } from "../market-analysis/marketAnalysisAdapters";
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
            <section className="flex h-[390px] min-w-0 items-center justify-center rounded-[10px] border border-[#6653fb] bg-white p-5">
                <p className="typography-body-small text-center text-[#d65353]">
                    감가 상각률 데이터를 불러오지 못했습니다.
                </p>
            </section>
        );
    }

    const chartData = toValuationForecastChartData(query.data.valuationForecast);

    if (chartData.points.length < 4) {
        return (
            <section className="flex h-[390px] min-w-0 items-center justify-center rounded-[10px] border border-[#6653fb] bg-white p-5">
                <p className="typography-body-small text-center text-[#83889e]">
                    감가 상각률 데이터가 없습니다.
                </p>
            </section>
        );
    }

    return (
        <section className="min-w-0 rounded-[10px] border border-[#6653fb] bg-white py-5">
            <ProductValuationForecastChart data={chartData} />
        </section>
    );
}
