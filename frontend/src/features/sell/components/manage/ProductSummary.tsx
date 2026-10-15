"use client";

import type { ProductResponse } from "@/features/sell/types";
import { ProductGallery } from "@/features/sell/components/manage/ProductGallery";
import { ProductSummaryActions } from "@/features/sell/components/manage/ProductSummaryActions";
import {
    conditionLabels,
    formatRegisteredAt,
    priceFormatter,
    statusLabels,
} from "@/features/sell/components/manage/productReviewUtils";

type ProductSummaryProps = {
    product: ProductResponse;
    registrationMethod: "ai" | "direct";
};

export function ProductSummary({ product, registrationMethod }: ProductSummaryProps) {
    return (
        <section aria-labelledby="product-summary-title" className="bg-white">
            <h2 id="product-summary-title" className="sr-only">
                등록된 상품 요약
            </h2>
            <div className="flex flex-col gap-5 md:gap-8 lg:flex-row lg:gap-[50px]">
                <ProductGallery key={product.id} product={product} />

                <div className="flex min-w-0 flex-1 flex-col py-2.5 lg:min-h-[432px]">
                    <div className="flex flex-wrap items-center gap-3">
                        <span className="rounded-full bg-[#fff4f4] px-3 py-1 text-[14px] leading-[22px] font-semibold tracking-[0.5px] text-[#fa503d] md:px-5 md:text-[16px] md:leading-[25px]">
                            {statusLabels[product.status]}
                        </span>
                        <span className="text-[12px] leading-5 font-normal tracking-[-0.5px] text-[#6b6c7b]">
                            {formatRegisteredAt(product.createdAt)}
                        </span>
                    </div>
                    <h3 className="mt-3 text-[22px] leading-8 font-bold tracking-[0.5px] break-keep text-[#363636] md:mt-4 md:text-[30px] md:leading-[42px]">
                        {product.title}
                    </h3>
                    <p className="mt-1 text-[24px] leading-9 font-bold tracking-[0.5px] text-[#6653fb] md:text-[30px] md:leading-[42px]">
                        {priceFormatter.format(product.price)}원
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2 md:mt-4 md:gap-5">
                        <span className="rounded-full border border-[#d3d3d3] bg-[#fafbff] px-4 py-1.5 text-[14px] leading-[22px] font-semibold tracking-[0.5px] text-[#83889e] md:px-5 md:py-2.5 md:text-[16px] md:leading-[25px]">
                            {product.category.name}
                        </span>
                        <span className="rounded-full border border-[#d3d3d3] bg-[#fafbff] px-4 py-1.5 text-[14px] leading-[22px] font-semibold tracking-[0.5px] text-[#6653fb] md:px-5 md:py-2.5 md:text-[16px] md:leading-[25px]">
                            {conditionLabels[product.condition]}
                        </span>
                    </div>

                    <div className="mt-auto">
                        <ProductSummaryActions
                            product={product}
                            actionHref={`/sell/manage/${product.id}/edit?method=${registrationMethod}`}
                        />
                    </div>
                </div>
            </div>
        </section>
    );
}
