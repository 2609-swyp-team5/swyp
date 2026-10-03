"use client";

import type { ProductPriceTrend } from "../../../types";
import type { StreamingQueryState } from "../../shared/streaming/productManagementStreamingTypes";
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
                <h3 className="text-[16px] leading-[25px] font-semibold tracking-[0.5px] text-[#6653fb]">
                    가격 변화 추이
                </h3>
                <section className="flex min-h-[363px] items-center justify-center rounded-[10px] border border-[#6653fb] bg-white p-6">
                    <p className="text-center text-[14px] leading-6 text-[#d65353]">
                        가격 변화 추이 데이터를 불러오지 못했습니다.
                    </p>
                </section>
            </div>
        );
    }

    const { points, totalTransactionCount } = query.data.priceTrend;

    if (points.length === 0) {
        return null;
    }

    return (
        <div className="flex min-w-0 flex-col gap-[10px]">
            <h3
                id="product-price-trend-title"
                className="text-[16px] leading-[25px] font-semibold tracking-[0.5px] text-[#6653fb]"
            >
                가격 변화 추이
            </h3>
            <section
                aria-labelledby="product-price-trend-title"
                className="h-[363px] min-w-0 rounded-[10px] border border-[#6653fb] bg-white px-5 py-[22px]"
            >
                <ProductPriceTrendChart
                    points={points}
                    totalTransactionCount={totalTransactionCount}
                />
            </section>
        </div>
    );
}
