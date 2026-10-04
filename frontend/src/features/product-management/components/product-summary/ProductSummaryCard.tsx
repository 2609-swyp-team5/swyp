"use client";

import { ExternalLink, Heart } from "lucide-react";

import { Button } from "@/common/components/ui/Button";
import { ProductGallery } from "@/features/sell/components/manage/ProductGallery";
import { ProductSummaryActions } from "@/features/sell/components/manage/ProductSummaryActions";
import type { ProductDetailSummaryResponse } from "../../schemas/productManagementResponseSchema";
import {
    conditionLabels,
    formatRegisteredAt,
    priceFormatter,
    statusLabels,
} from "@/features/sell/components/manage/productReviewUtils";

import { PlatformShortcutDialog } from "./PlatformShortcutDialog";

type InterestSummaryActions = {
    detailLabel: string;
    platformName: string | null;
    externalUrl: string | null;
    deletePending: boolean;
    onDelete: () => void;
};

type ProductSummaryCardProps = {
    product: ProductDetailSummaryResponse;
    interest?: InterestSummaryActions;
};

const detailStatusLabels: Record<string, string> = {
    ...statusLabels,
    RESERVED: "예약중",
};

export function ProductSummaryCard({ product, interest }: ProductSummaryCardProps) {
    const interestPlatformNames = interest
        ? interest.platformName
            ? [interest.platformName]
            : Array.from(
                  new Set(
                      product.platforms
                          .map((platform) => platform.platformName || platform.platform)
                          .filter(Boolean),
                  ),
              )
        : [];

    return (
        <section
            aria-labelledby="product-summary-detail-title"
            className="rounded-[16px] border border-[#dee5ed] bg-white p-5"
        >
            <div className="grid gap-6 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
                <ProductGallery key={product.id} product={product} layout="bottom" />

                <div className="flex h-full min-w-0 flex-col py-1">
                    <div className="flex items-center justify-between gap-3">
                        <div className="flex flex-wrap items-center gap-3">
                            {interest && interestPlatformNames.length > 0 ? (
                                interestPlatformNames.map((platformName) => (
                                    <span
                                        key={platformName}
                                        className="rounded-full bg-[#fff4f4] px-4 py-1 text-[13px] leading-5 font-semibold text-[#fa503d]"
                                    >
                                        {platformName}
                                    </span>
                                ))
                            ) : (
                                <span className="rounded-full bg-[#fff4f4] px-4 py-1 text-[13px] leading-5 font-semibold text-[#fa503d]">
                                    {interest?.detailLabel ?? detailStatusLabels[product.status]}
                                </span>
                            )}
                            <span className="text-[11px] leading-4 text-[#6b6c7b]">
                                {formatRegisteredAt(product.createdAt)}
                            </span>
                        </div>
                        {interest ? (
                            <button
                                type="button"
                                aria-label="관심 상품 삭제"
                                disabled={interest.deletePending}
                                className="flex items-center gap-1 rounded-full px-3 py-2 text-[12px] leading-5 font-semibold text-[#83889e] transition-colors hover:bg-[#f5f3ff] hover:text-[#6653fb] disabled:cursor-wait disabled:opacity-50"
                                onClick={interest.onDelete}
                            >
                                <Heart
                                    aria-hidden="true"
                                    className="size-4 fill-[#6653fb] text-[#6653fb]"
                                />
                                관심
                            </button>
                        ) : product.status === "ON_SALE" && product.platforms.length > 0 ? (
                            <PlatformShortcutDialog
                                product={product}
                                label="판매글 바로가기"
                                compact
                            />
                        ) : null}
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
                        {product.condition ? (
                            <span className="rounded-full border border-[#d3d3d3] bg-[#fafbff] px-4 py-2 text-[13px] leading-5 font-semibold text-[#6653fb]">
                                {conditionLabels[product.condition]}
                            </span>
                        ) : null}
                    </div>
                    <div className="mt-auto flex items-end justify-end gap-[30px] pt-6">
                        {interest ? (
                            interest.externalUrl ? (
                                <Button
                                    asChild
                                    variant="ghost"
                                    className="h-auto flex-col gap-2 rounded-xl p-2.5 text-[#83889e] hover:bg-[#f5f3ff] hover:text-[#6653fb]"
                                >
                                    <a href={interest.externalUrl} target="_blank" rel="noreferrer">
                                        <span className="flex size-10 items-center justify-center rounded-full bg-[#eaeafd]">
                                            <ExternalLink
                                                aria-hidden="true"
                                                className="size-[22px] text-[#6653fb]"
                                            />
                                        </span>
                                        <span className="text-[16px] leading-[25px] font-normal">
                                            바로가기
                                        </span>
                                    </a>
                                </Button>
                            ) : product.status === "ON_SALE" && product.platforms.length > 0 ? (
                                <PlatformShortcutDialog product={product} />
                            ) : null
                        ) : (
                            <ProductSummaryActions
                                product={product}
                                actionHref={`/sell/manage/${product.id}`}
                                actionLabel="자세히보기"
                                actionIconSrc="/sell/detail.svg"
                                canMarkAsSold={product.status === "ON_SALE"}
                            />
                        )}
                    </div>
                </div>
            </div>
        </section>
    );
}
