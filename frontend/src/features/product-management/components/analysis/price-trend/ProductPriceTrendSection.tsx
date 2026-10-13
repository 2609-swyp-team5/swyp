"use client";

import type { ProductPriceTrend } from "../../../types";
import type { StreamingQueryState } from "../../shared/streaming/productManagementStreamingTypes";
import { toPriceTrendChartData } from "../market-analysis/marketAnalysisAdapters";
import { ProductPriceTrendChart } from "./ProductPriceTrendChart";
import { ProductPriceTrendSkeleton } from "./ProductPriceTrendSkeleton";

export function ProductPriceTrendSection({
    query,
}: {
    query: StreamingQueryState<ProductPriceTrend>;
}) {
    if (query.isPending) {
        return <ProductPriceTrendSkeleton />;
    }

    if (query.error || !query.data) {
        return (
            <div className="flex flex-col gap-[10px]">
                <section className="flex min-h-[363px] items-center justify-center rounded-[10px] border border-[#6653fb] bg-white p-6">
                    <p className="text-center text-[14px] leading-6 text-[#d65353]">
                        가격 변화 추이 데이터를 불러오지 못했습니다.
                    </p>
                </section>
            </div>
        );
    }

    const chartData = toPriceTrendChartData(query.data.priceTrend);

    if (chartData.points.length === 0) {
        return (
            <section className="flex min-h-[363px] items-center justify-center rounded-[10px] border border-[#6653fb] bg-white p-6">
                <p className="text-center text-[14px] leading-6 text-[#83889e]">
                    최근 거래 가격 추이 데이터가 없습니다.
                </p>
            </section>
        );
    }

    return (
        <div className="flex min-w-0 flex-col gap-[10px]">
            <section
                aria-label="최근 30일 일 평균 거래가"
                className="h-[363px] min-w-0 rounded-[10px] border border-[#6653fb] bg-white px-5 py-[22px]"
            >
                <ProductPriceTrendChart data={chartData} />
            </section>
        </div>
    );
}
