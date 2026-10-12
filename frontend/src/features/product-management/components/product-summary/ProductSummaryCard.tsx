"use client";

import { ExternalLink, Heart } from "lucide-react";

import { Button } from "@/common/components/ui/Button";
import { Separator } from "@/common/components/ui/Separator";
import { cn } from "@/common/lib/utils";
import { ProductGallery } from "@/features/sell/components/manage/ProductGallery";
import { ProductSummaryActions } from "@/features/sell/components/manage/ProductSummaryActions";
import {
    conditionLabels,
    formatRegisteredAt,
    priceFormatter,
    statusLabels,
    tradeMethodLabels,
} from "@/features/sell/components/manage/productReviewUtils";
import type { TradeMethod } from "@/features/sell/types";

import type { ProductDetailSummaryResponse } from "../../schemas/productManagementResponseSchema";
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

const detailStatusClassNames: Record<string, string> = {
    DRAFT: "bg-[#fff4f4] text-[#fa503d]",
    SOLD_OUT: "bg-[#a9adbd] text-white",
};

function DetailRow({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex min-w-0 items-baseline gap-4">
            <dt className="shrink-0 text-[13px] leading-5 font-normal text-[#9aa0b0]">{label}</dt>
            <dd className="min-w-0 truncate text-[13px] leading-5 font-normal text-[#464646]">
                {value}
            </dd>
        </div>
    );
}

function SummaryStat({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex flex-col items-center justify-center gap-0.5">
            <span className="text-[13px] leading-5 font-normal text-[#9aa0b0]">{label}</span>
            <span className="text-[20px] leading-[30px] font-medium text-[#374151]">{value}</span>
        </div>
    );
}

function formatTradeMethod(tradeMethod: TradeMethod | null | undefined) {
    return tradeMethod ? tradeMethodLabels[tradeMethod] : "미설정";
}

function ManagementSummaryCard({ product }: { product: ProductDetailSummaryResponse }) {
    const titleId = `product-summary-detail-title-${product.id}`;
    const description = product.description?.trim() || "등록된 상세 설명이 없습니다.";
    const includedItems = product.includedItems.length ? product.includedItems.join(" · ") : "없음";
    const daysOnSale = product.daysOnSale === null ? "-" : `${product.daysOnSale}일째`;
    const viewCount = product.viewCount === null ? "-" : product.viewCount.toLocaleString("ko-KR");

    return (
        <section
            aria-labelledby={titleId}
            className="w-full overflow-hidden rounded-[20px] border border-[#d3d3d3] bg-white"
        >
            <div className="grid h-[442px] gap-10 p-[30px] lg:grid-cols-[310px_minmax(0,1fr)]">
                <ProductGallery
                    key={product.id}
                    product={product}
                    layout="bottom"
                    variant="management"
                />

                <div className="flex min-w-0 flex-col">
                    <div className="flex items-center gap-3">
                        <span
                            className={cn(
                                "inline-flex h-6 items-center rounded-full px-2.5 text-[13px] leading-5 font-semibold",
                                detailStatusClassNames[product.status] ?? "bg-[#fa503d] text-white",
                            )}
                        >
                            {detailStatusLabels[product.status]}
                        </span>
                        <span className="text-[11px] leading-4 font-normal text-[#6b6c7b]">
                            {formatRegisteredAt(product.createdAt)}
                        </span>
                    </div>
                    <h2
                        id={titleId}
                        className="mt-1 line-clamp-1 text-[25px] leading-10 font-medium tracking-[0.5px] break-keep text-[#363636]"
                    >
                        {product.title}
                    </h2>
                    <p className="text-[22px] leading-[30px] font-semibold tracking-[0.5px] text-[#6653fb]">
                        {priceFormatter.format(product.price)}원
                    </p>

                    <dl className="mt-[30px] grid grid-cols-2 gap-x-[30px] gap-y-[10px]">
                        <DetailRow
                            label="상품상태"
                            value={
                                product.condition ? conditionLabels[product.condition] : "미설정"
                            }
                        />
                        <DetailRow label="카테고리" value={product.category.name} />
                        <DetailRow label="구성품" value={includedItems} />
                        <DetailRow
                            label="거래방식"
                            value={formatTradeMethod(product.tradeMethod)}
                        />
                    </dl>

                    <Separator className="my-5" />

                    <div className="min-h-0">
                        <p className="text-[13px] leading-5 font-normal text-[#9aa0b0]">
                            상품 설명
                        </p>
                        <p className="mt-2 line-clamp-2 text-[13px] leading-5 font-normal break-keep text-[#464646]">
                            {description}
                        </p>
                    </div>

                    <div className="mt-auto flex w-full items-end justify-end gap-5 pt-4">
                        <ProductSummaryActions
                            product={product}
                            actionHref={`/sell/manage/${product.id}`}
                            actionLabel="자세히 보기"
                            canMarkAsSold={product.status === "ON_SALE"}
                            variant="management"
                        />
                        {product.status === "ON_SALE" || product.status === "SOLD_OUT" ? (
                            <PlatformShortcutDialog
                                product={product}
                                label="바로가기"
                                variant="management"
                            />
                        ) : null}
                    </div>
                </div>
            </div>

            <Separator className="bg-[#d3d3d3]" />
            <div className="grid h-[96px] grid-cols-[1fr_1px_1fr_1px_1fr] bg-[#fafbff]">
                <SummaryStat label="판매 시작" value={daysOnSale} />
                <Separator orientation="vertical" className="h-[54px] self-center" />
                <SummaryStat label="조회" value={viewCount} />
                <Separator orientation="vertical" className="h-[54px] self-center" />
                <SummaryStat label="관심" value={product.interestCount.toLocaleString("ko-KR")} />
            </div>
        </section>
    );
}

function InterestSummaryCard({
    product,
    interest,
}: {
    product: ProductDetailSummaryResponse;
    interest: InterestSummaryActions;
}) {
    const interestPlatformNames = interest.platformName
        ? [interest.platformName]
        : Array.from(
              new Set(
                  product.platforms
                      .map((platform) => platform.platformName || platform.platform)
                      .filter(Boolean),
              ),
          );

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
                            {interestPlatformNames.length > 0 ? (
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
                                    {interest.detailLabel}
                                </span>
                            )}
                            <span className="text-[11px] leading-4 text-[#6b6c7b]">
                                {formatRegisteredAt(product.createdAt)}
                            </span>
                        </div>
                        {interest.externalUrl ? (
                            <Button
                                asChild
                                variant="ghost"
                                className="h-auto gap-1.5 rounded-[10px] border border-[#d3d3d3] bg-white text-[13px] text-[#6653fb] hover:border-[#6653fb] hover:bg-[#fafbff]"
                            >
                                <a href={interest.externalUrl} target="_blank" rel="noreferrer">
                                    <ExternalLink
                                        aria-hidden="true"
                                        className="size-[18px] text-[#6653fb]"
                                    />
                                    판매글 바로가기
                                </a>
                            </Button>
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
                        <Button
                            type="button"
                            variant="ghost"
                            aria-label="관심 상품 삭제"
                            disabled={interest.deletePending}
                            className="h-auto flex-col gap-2 rounded-xl p-2.5 text-[#83889e] hover:bg-[#f5f3ff] hover:text-[#6653fb] disabled:cursor-wait disabled:opacity-50"
                            onClick={interest.onDelete}
                        >
                            <span className="flex size-10 items-center justify-center rounded-full bg-[#eaeafd]">
                                <Heart
                                    aria-hidden="true"
                                    className="size-[22px] fill-[#6653fb] text-[#6653fb]"
                                />
                            </span>
                        </Button>
                    </div>
                </div>
            </div>
        </section>
    );
}

export function ProductSummaryCard({ product, interest }: ProductSummaryCardProps) {
    return interest ? (
        <InterestSummaryCard product={product} interest={interest} />
    ) : (
        <ManagementSummaryCard product={product} />
    );
}
