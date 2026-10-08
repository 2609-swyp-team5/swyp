import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/common/components/ui/Card";
import { cn } from "@/common/lib/utils";

import type { ProductMarketAnalysis } from "../../../types";
import { formatManWon } from "./formatters";

function clamp(value: number, min: number, max: number) {
    return Math.min(Math.max(value, min), max);
}

function PriceMetric({
    label,
    value,
    className,
}: {
    label: string;
    value: string;
    className?: string;
}) {
    return (
        <div className={cn("flex min-w-0 flex-1 flex-col items-center gap-1 p-[10px]", className)}>
            <span className="text-[11px] leading-4 text-[#777987]">{label}</span>
            <strong className="text-[15px] leading-[22px] font-bold text-[#2f3037]">{value}</strong>
        </div>
    );
}

function ExpectedPriceLabel({ price }: { price: string }) {
    return (
        <div className="flex h-[54px] w-[98px] flex-col items-center justify-center gap-[4px] rounded-[6px] border border-[#e1e1e1] bg-white">
            <span className="text-[11px] leading-[13px] font-bold text-[#9a84f3]">예상가격</span>
            <strong className="text-[15px] leading-[18px] font-semibold whitespace-nowrap text-black">
                {price}
            </strong>
        </div>
    );
}

function PriceMarker() {
    return (
        <div className="flex size-[29px] items-center justify-center rounded-full bg-[#d9d1ff]">
            <span className="size-[17px] rounded-full bg-[#6b49fd]" aria-hidden="true" />
        </div>
    );
}

export function MarketAnalysisPriceDistribution({ analysis }: { analysis: ProductMarketAnalysis }) {
    const priceRange = Math.max(analysis.maxPrice - analysis.minPrice, 1);
    const expectedPosition = clamp(
        ((analysis.marketExpectedPrice - analysis.minPrice) / priceRange) * 100,
        0,
        100,
    );
    const labelPosition = `clamp(49px, ${expectedPosition}%, calc(100% - 49px))`;

    return (
        <Card className="min-w-0 gap-0 rounded-[10px] border border-[#6653fb] bg-white p-0 text-[#2f3037] ring-0">
            <CardHeader className="gap-[5px] rounded-none p-5">
                <CardTitle className="text-[20px] leading-[25px] font-semibold tracking-[0.5px] text-[#363636]">
                    거래 가격 분포
                </CardTitle>
                <CardDescription className="text-[12px] leading-[15px] text-[#a1a3ae]">
                    비슷한 상품의 가격과 비교해 보세요.
                </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-[13px] rounded-none bg-[#fafbff] px-5 pt-5 pb-[30px]">
                <div className="relative h-[52px] w-full">
                    <div
                        className="absolute top-0 -translate-x-1/2"
                        style={{ left: labelPosition }}
                    >
                        <ExpectedPriceLabel price={formatManWon(analysis.marketExpectedPrice)} />
                    </div>
                </div>
                <div className="relative h-[15px] w-full">
                    <div className="absolute inset-0 overflow-hidden rounded-[999px] bg-white shadow-[inset_0_1px_2px_0_rgba(0,0,0,0.1)]">
                        <div
                            className="absolute top-[-10px] left-[-5px] h-[50px] rounded-[999px] bg-gradient-to-r from-[#d1d6fe] to-[#c4b0f7]"
                            style={{ width: `${Math.max(expectedPosition, 0)}%` }}
                            aria-hidden="true"
                        />
                    </div>
                    <div className="absolute inset-y-0 right-[50px] left-[50px]">
                        {[0, 25, 50, 75, 100].map((position) => (
                            <span
                                key={position}
                                className="absolute inset-y-0 w-px -translate-x-1/2 bg-[#e1e1e1]"
                                style={{ left: `${position}%` }}
                                aria-hidden="true"
                            />
                        ))}
                    </div>
                    <span
                        className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2"
                        style={{ left: `${expectedPosition}%` }}
                        aria-hidden="true"
                    >
                        <PriceMarker />
                    </span>
                </div>
            </CardContent>
            <div className="flex items-center justify-between gap-[5px] bg-[#6b49fd] px-5 py-2.5 text-white">
                <span className="text-[18px] leading-5 font-semibold">예상 가격</span>
                <strong className="text-[20px] leading-[25px] font-bold">
                    {formatManWon(analysis.marketExpectedPrice)}
                </strong>
            </div>
            <CardFooter className="rounded-none border-0 bg-white px-2.5 py-5 text-center">
                <div className="flex w-full items-center justify-between overflow-hidden rounded-[5px] bg-white">
                    <PriceMetric
                        label="최저가"
                        value={formatManWon(analysis.minPrice)}
                        className="border-r border-[#d3d3d3]"
                    />
                    <PriceMetric
                        label="평균 거래가"
                        value={formatManWon(analysis.averagePrice)}
                        className="border-r border-[#d3d3d3]"
                    />
                    <PriceMetric label="최고가" value={formatManWon(analysis.maxPrice)} />
                </div>
            </CardFooter>
        </Card>
    );
}
