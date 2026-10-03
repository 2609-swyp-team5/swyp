import type { ProductPriceTrend, ProductValuationForecast } from "../../../types";
import type { StreamingQueryState } from "../../shared/streaming/productManagementStreamingTypes";
import { ProductPriceTrendSection } from "../price-trend/ProductPriceTrendSection";
import { ProductValuationForecastSection } from "../valuation-forecast/ProductValuationForecastSection";

export function MarketAnalysisSkeleton({
    priceTrendQuery,
    valuationForecastQuery,
}: {
    priceTrendQuery: StreamingQueryState<ProductPriceTrend>;
    valuationForecastQuery: StreamingQueryState<ProductValuationForecast>;
}) {
    return (
        <div aria-label="AI 시세 분석을 불러오는 중">
            <div className="animate-pulse">
                <div className="grid min-h-[300px] gap-[30px] bg-white p-[30px] lg:grid-cols-2">
                    <div className="flex flex-col justify-center gap-4">
                        <div className="h-10 w-28 rounded-full bg-[#eef0f5]" />
                        <div className="h-11 w-3/4 rounded bg-[#eef0f5]" />
                        <div className="h-5 w-full rounded bg-[#f4f5f8]" />
                        <div className="h-5 w-4/5 rounded bg-[#f4f5f8]" />
                    </div>
                    <div className="mx-auto size-[274px] rounded-full bg-[#eef0f5]" />
                </div>
            </div>
            <div className="flex flex-col gap-5 bg-[#fafbff] px-10 py-[30px]">
                <div className="animate-pulse">
                    <div className="h-[95px] rounded-[10px] border border-[#d3d3d3] bg-white" />
                    <div className="mt-5 grid gap-[30px] lg:grid-cols-2">
                        <div className="space-y-4 py-5">
                            <div className="h-5 w-28 rounded bg-[#eef0f5]" />
                            <div className="h-11 w-full rounded bg-[#eef0f5]" />
                            <div className="h-10 w-full rounded bg-[#f4f5f8]" />
                            <div className="h-10 w-full rounded bg-[#f4f5f8]" />
                        </div>
                        <div className="h-[353px] rounded-[20px] bg-[#eef0f5]" />
                    </div>
                </div>
                <ProductPriceTrendSection query={priceTrendQuery} />
                <ProductValuationForecastSection query={valuationForecastQuery} />
            </div>
        </div>
    );
}
