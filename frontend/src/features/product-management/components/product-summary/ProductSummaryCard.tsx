"use client";

import { ProductGallery } from "@/features/sell/components/manage/ProductGallery";
import { ProductSummaryActions } from "@/features/sell/components/manage/ProductSummaryActions";
import type { ProductResponse } from "@/features/sell/types";
import {
    conditionLabels,
    formatRegisteredAt,
    priceFormatter,
    statusLabels,
} from "@/features/sell/components/manage/productReviewUtils";

import { PlatformShortcutDialog } from "./PlatformShortcutDialog";

export function ProductSummaryCard({ product }: { product: ProductResponse }) {
    return (
        <section
            aria-labelledby="product-summary-detail-title"
            className="rounded-[16px] border border-[#dee5ed] bg-white p-5"
        >
            <div className="grid gap-6 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
                <ProductGallery product={product} layout="bottom" />

                <div className="flex min-w-0 flex-col py-1">
                    <div className="flex flex-wrap items-center gap-3">
                        <span className="rounded-full bg-[#fff4f4] px-4 py-1 text-[13px] leading-5 font-semibold text-[#fa503d]">
                            {statusLabels[product.status]}
                        </span>
                        <span className="text-[11px] leading-4 text-[#6b6c7b]">
                            {formatRegisteredAt(product.createdAt)}
                        </span>
                    </div>
                    <h2
                        id="product-summary-detail-title"
                        className="mt-4 text-[24px] leading-9 font-bold break-keep text-[#363636]"
                    >
                        {product.title}
                    </h2>
                    <p className="mt-1 text-[26px] leading-9 font-bold text-[#6653fb]">
                        {priceFormatter.format(product.price)}원
                    </p>
                    <div className="mt-5 flex flex-wrap gap-2.5">
                        <span className="rounded-full border border-[#d3d3d3] bg-[#fafbff] px-4 py-2 text-[13px] leading-5 font-semibold text-[#83889e]">
                            {product.category.name}
                        </span>
                        <span className="rounded-full border border-[#d3d3d3] bg-[#fafbff] px-4 py-2 text-[13px] leading-5 font-semibold text-[#6653fb]">
                            {conditionLabels[product.condition]}
                        </span>
                    </div>
                    <div className="mt-6 flex items-end justify-between gap-4">
                        {product.status === "ON_SALE" ? (
                            <PlatformShortcutDialog product={product} />
                        ) : (
                            <span aria-hidden="true" />
                        )}
                        <div className="w-fit">
                            <ProductSummaryActions
                                product={product}
                                editHref={`/sell/manage/${product.id}/edit`}
                            />
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
