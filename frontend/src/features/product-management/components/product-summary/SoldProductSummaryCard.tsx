"use client";

import { ArrowRight } from "lucide-react";

import type { ProductManagementOverviewResponse } from "../../schemas/productManagementResponseSchema";
import { priceFormatter } from "@/features/sell/components/manage/productReviewUtils";

type SoldProductSummaryCardProps = {
    product: ProductManagementOverviewResponse;
    onDetailsClick?: () => void;
};

export function SoldProductSummaryCard({ product, onDetailsClick }: SoldProductSummaryCardProps) {
    return (
        <section
            aria-labelledby="sold-product-summary-title"
            className="overflow-hidden rounded-[16px] border border-[#83889e] bg-[#fafbff] shadow-[0_1px_3px_0_rgba(0,0,0,0.04)]"
        >
            <div className="flex flex-col gap-5 border-b border-[#d3d3d3] bg-white px-[30px] py-10">
                <div className="flex flex-col gap-5">
                    <span className="w-fit rounded-full border border-[#fa503d] bg-[#fff4f4] px-5 py-[3px] text-[16px] leading-[25px] font-semibold tracking-[0.5px] text-[#fa503d]">
                        판매완료
                    </span>
                    <div>
                        <h2
                            id="sold-product-summary-title"
                            className="text-[25px] leading-10 font-medium tracking-[0.5px] break-keep text-[#374151]"
                        >
                            {product.title}
                        </h2>
                        <p className="text-[16px] leading-[25px] font-semibold tracking-[0.5px] text-[#9aa0b0]">
                            등록가 {priceFormatter.format(product.price)}원
                        </p>
                    </div>
                </div>

                <dl className="flex flex-col gap-4 text-[16px] leading-[25px] font-semibold tracking-[0.5px]">
                    <div className="flex items-center justify-between border-b border-[#d3d3d3] py-2.5">
                        <dt className="text-[#374151]">팔린 플랫폼</dt>
                        <dd className="text-[#111827]">{product.soldPlatform ?? "정보 없음"}</dd>
                    </div>
                    <div className="flex items-center justify-between py-2.5">
                        <dt className="text-[#374151]">최종판매가격</dt>
                        <dd className="text-[#111827]">
                            {product.soldPrice === null || product.soldPrice === undefined
                                ? "정보 없음"
                                : `${priceFormatter.format(product.soldPrice)}원`}
                        </dd>
                    </div>
                </dl>

                <div className="flex justify-end">
                    <button
                        type="button"
                        className="flex items-center gap-3 text-[16px] leading-[25px] font-semibold tracking-[0.5px] text-[#6653fb] hover:text-[#5745e7]"
                        onClick={onDetailsClick}
                    >
                        자세히 보기
                        <ArrowRight aria-hidden="true" className="size-4" />
                    </button>
                </div>
            </div>
        </section>
    );
}
