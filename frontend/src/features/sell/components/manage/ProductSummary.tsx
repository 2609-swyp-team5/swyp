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
            <div className="flex flex-col gap-8 lg:flex-row lg:gap-[50px]">
                <ProductGallery key={product.id} product={product} />

                <div className="flex min-w-0 flex-1 flex-col py-2.5 lg:min-h-[432px]">
                    <div className="flex flex-wrap items-center gap-3">
                        <span className="rounded-full bg-[#fff4f4] px-5 py-1 text-[16px] leading-[25px] font-semibold tracking-[0.5px] text-[#fa503d]">
                            {statusLabels[product.status]}
                        </span>
                        <span className="text-[12px] leading-5 font-normal tracking-[-0.5px] text-[#6b6c7b]">
                            {formatRegisteredAt(product.createdAt)}
                        </span>
                    </div>
                    <h3 className="mt-4 text-[30px] leading-[42px] font-bold tracking-[0.5px] break-keep text-[#363636]">
                        {product.title}
                    </h3>
                    <p className="mt-1 text-[30px] leading-[42px] font-bold tracking-[0.5px] text-[#6653fb]">
                        {priceFormatter.format(product.price)}원
                    </p>
                    <div className="mt-4 flex flex-wrap gap-5">
                        <span className="rounded-full border border-[#d3d3d3] bg-[#fafbff] px-5 py-2.5 text-[16px] leading-[25px] font-semibold tracking-[0.5px] text-[#83889e]">
                            {product.category.name}
                        </span>
                        <span className="rounded-full border border-[#d3d3d3] bg-[#fafbff] px-5 py-2.5 text-[16px] leading-[25px] font-semibold tracking-[0.5px] text-[#6653fb]">
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
