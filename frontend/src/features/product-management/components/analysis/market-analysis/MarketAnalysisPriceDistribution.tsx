import { cn } from "@/common/lib/utils";

import type { ProductMarketAnalysis } from "../../../types";
import { formatManWon } from "./formatters";

function PriceMetric({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex min-w-0 flex-1 flex-col items-center gap-1 px-1">
            <span className="text-[11px] leading-4 text-[#777987]">{label}</span>
            <strong className="text-[15px] leading-[22px] text-[#2f3037]">{value}</strong>
        </div>
    );
}

export function MarketAnalysisPriceDistribution({ analysis }: { analysis: ProductMarketAnalysis }) {
    const buckets = analysis.priceDistribution;
    const maxCount = Math.max(...buckets.map((bucket) => bucket.count), 1);
    const minPrice = Math.min(analysis.minPrice, ...buckets.map((bucket) => bucket.from));
    const maxPrice = Math.max(analysis.maxPrice, ...buckets.map((bucket) => bucket.to));
    const priceRange = Math.max(maxPrice - minPrice, 1);
    const expectedPosition = Math.min(
        Math.max(((analysis.marketExpectedPrice - minPrice) / priceRange) * 100, 0),
        100,
    );

    return (
        <div className="flex min-w-0 flex-col gap-[10px]">
            <div className="px-[10px]">
                <p className="text-[16px] leading-[25px] font-semibold tracking-[0.5px] text-[#6653fb]">
                    중고시세
                </p>
            </div>
            <div className="flex h-[353px] flex-col overflow-hidden rounded-[20px] border border-[#6653fb] bg-white">
                <div className="flex items-center justify-between px-5 pt-[10px] pb-[5px]">
                    <p className="text-[12px] leading-[18px] font-semibold text-[#2f3037]">
                        거래 가격 분포
                    </p>
                    <span className="text-[10px] leading-[15px] text-[#a1a3ae]">단위: 만 원</span>
                </div>
                <div className="relative h-[169px] px-[10px]">
                    <div className="absolute inset-x-[10px] top-0 bottom-6 flex items-end gap-2 border-b border-[#d3d3d3]">
                        {buckets.length > 0 ? (
                            buckets.map((bucket) => {
                                const highlightsAverage =
                                    analysis.averagePrice >= bucket.from &&
                                    analysis.averagePrice <= bucket.to;
                                const highlightsExpected =
                                    analysis.marketExpectedPrice >= bucket.from &&
                                    analysis.marketExpectedPrice <= bucket.to;

                                return (
                                    <div
                                        key={`${bucket.from}-${bucket.to}`}
                                        className="flex min-w-0 flex-1 flex-col items-center justify-end gap-1"
                                    >
                                        <span className="text-[10px] leading-[15px] text-[#777987]">
                                            {bucket.count}
                                        </span>
                                        <div
                                            className={cn(
                                                "w-full max-w-9 rounded-t-[5px]",
                                                highlightsAverage || highlightsExpected
                                                    ? "bg-[#6653fb]"
                                                    : "bg-[#eeeefe]",
                                            )}
                                            style={{
                                                height: `${Math.max((bucket.count / maxCount) * 96, 12)}px`,
                                            }}
                                        />
                                    </div>
                                );
                            })
                        ) : (
                            <div className="flex h-full w-full items-center justify-center text-[13px] text-[#a1a3ae]">
                                가격 분포 데이터가 없습니다.
                            </div>
                        )}
                    </div>
                    <div
                        className="absolute top-2 bottom-6 w-px bg-[#6653fb]"
                        style={{ left: `calc(10px + (100% - 20px) * ${expectedPosition / 100})` }}
                        aria-hidden="true"
                    />
                    <div
                        className="absolute top-0 -translate-x-1/2 rounded-full bg-[#6653fb] px-3 py-1 text-[10px] leading-[15px] font-semibold whitespace-nowrap text-white shadow-[0_3px_8px_rgba(102,83,251,0.25)]"
                        style={{ left: `${expectedPosition}%` }}
                    >
                        예상 {formatManWon(analysis.marketExpectedPrice)}
                    </div>
                    <div className="absolute right-0 bottom-0 left-0 flex justify-between px-[10px] text-[10px] leading-[15px] text-[#777987]">
                        <span>{formatManWon(minPrice)}</span>
                        <span>{formatManWon(maxPrice)}</span>
                    </div>
                </div>
                <div className="flex items-center justify-center gap-[10px] overflow-hidden px-[10px] py-5 text-center">
                    <PriceMetric label="최저가" value={formatManWon(analysis.minPrice)} />
                    <span className="h-8 w-px bg-[#d3d3d3]" aria-hidden="true" />
                    <PriceMetric label="평균 거래가" value={formatManWon(analysis.averagePrice)} />
                    <span className="h-8 w-px bg-[#d3d3d3]" aria-hidden="true" />
                    <PriceMetric label="최고가" value={formatManWon(analysis.maxPrice)} />
                </div>
                <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-1 bg-[#f3f3ff] px-[10px] text-[#6653fb]">
                    <span className="text-[11px] leading-4">예상 가격</span>
                    <strong className="text-[15px] leading-[22px]">
                        {formatManWon(analysis.marketExpectedPrice)}
                    </strong>
                </div>
            </div>
        </div>
    );
}
