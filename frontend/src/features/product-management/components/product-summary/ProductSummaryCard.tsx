"use client";

import Image from "next/image";

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
    variant?: "default" | "sold";
};

const detailStatusLabels: Record<string, string> = {
    ...statusLabels,
    RESERVED: "예약중",
};

const detailStatusClassNames: Record<string, string> = {
    DRAFT: "bg-[#fff4f4] text-[#fa503d]",
    SOLD_OUT: "bg-[#a9adbd] text-white",
};

function DetailRow({
    label,
    value,
    className,
    labelClassName,
    valueClassName,
}: {
    label: string;
    value: string;
    className?: string;
    labelClassName?: string;
    valueClassName?: string;
}) {
    return (
        <div className={cn("flex min-w-0 items-baseline gap-4", className)}>
            <dt
                className={cn(
                    "shrink-0 text-[13px] leading-5 font-normal text-[#9aa0b0]",
                    labelClassName,
                )}
            >
                {label}
            </dt>
            <dd
                className={cn(
                    "min-w-0 truncate text-[13px] leading-5 font-normal text-[#464646]",
                    valueClassName,
                )}
            >
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

function InterestPlatformBadge({ platformName }: { platformName: string }) {
    return (
        <span className="inline-flex h-6 items-center rounded-full bg-[#fff4f4] px-2.5 text-[13px] leading-5 font-semibold text-[#fa503d]">
            {platformName}
        </span>
    );
}

function InterestExternalLinkButton({ href, label }: { href: string; label: string }) {
    return (
        <Button
            asChild
            variant="ghost"
            className="h-[52px] w-[52px] flex-col gap-[5px] rounded-none p-[5px] text-[#83889e] hover:bg-transparent hover:text-[#6653fb]"
        >
            <a href={href} target="_blank" rel="noreferrer">
                <Image src="/sell/actions/shortcut.svg" alt="" width={25} height={25} />
                <span className="text-[11px] leading-[16px] font-normal tracking-[-0.5px]">
                    {label}
                </span>
            </a>
        </Button>
    );
}

function ProductSummaryCardFrame({
    product,
    interest,
    variant = "default",
}: {
    product: ProductDetailSummaryResponse;
    interest?: InterestSummaryActions;
    variant?: "default" | "sold";
}) {
    const titleId = `product-summary-detail-title-${product.id}`;
    const isSoldVariant = variant === "sold";
    const description = product.description?.trim() || "등록된 상세 설명이 없습니다.";
    const includedItems = product.includedItems.length ? product.includedItems.join(" · ") : "없음";
    const daysOnSale = product.daysOnSale === null ? "-" : `${product.daysOnSale}일째`;
    const viewCount = product.viewCount === null ? "-" : product.viewCount.toLocaleString("ko-KR");
    const interestPlatformNames = interest?.platformName
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
                        {interest ? (
                            interestPlatformNames.length > 0 ? (
                                interestPlatformNames.map((platformName) => (
                                    <InterestPlatformBadge
                                        key={platformName}
                                        platformName={platformName}
                                    />
                                ))
                            ) : (
                                <InterestPlatformBadge platformName={interest.detailLabel} />
                            )
                        ) : (
                            <span
                                className={cn(
                                    "inline-flex h-6 items-center rounded-full px-2.5 text-[13px] leading-5 font-semibold",
                                    detailStatusClassNames[product.status] ??
                                        "bg-[#fa503d] text-white",
                                )}
                            >
                                {detailStatusLabels[product.status]}
                            </span>
                        )}
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

                    {isSoldVariant ? (
                        <dl className="mt-[30px] flex flex-col text-[16px] leading-[25px]">
                            <DetailRow
                                label="팔린 플랫폼"
                                value={product.soldPlatform ?? "정보 없음"}
                                className="justify-between py-2.5"
                                labelClassName="text-[16px] leading-[25px] text-[#374151]"
                                valueClassName="font-semibold tracking-[-0.5px] text-[#111827]"
                            />
                            <Separator className="bg-[#d3d3d3]" />
                            <DetailRow
                                label="최종판매가격"
                                value={
                                    product.soldPrice === null || product.soldPrice === undefined
                                        ? "정보 없음"
                                        : `${priceFormatter.format(product.soldPrice)}원`
                                }
                                className="justify-between py-2.5"
                                labelClassName="text-[16px] leading-[25px] text-[#374151]"
                                valueClassName="font-semibold tracking-[-0.5px] text-[#111827]"
                            />
                        </dl>
                    ) : (
                        <>
                            <dl className="mt-[30px] grid grid-cols-2 gap-x-[30px] gap-y-[10px]">
                                <DetailRow
                                    label="상품상태"
                                    value={
                                        product.condition
                                            ? conditionLabels[product.condition]
                                            : "미설정"
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
                        </>
                    )}

                    <div className="mt-auto flex w-full items-end justify-end gap-[15px] pt-4">
                        {interest ? (
                            <>
                                {interest.externalUrl ? (
                                    <InterestExternalLinkButton
                                        href={interest.externalUrl}
                                        label="바로가기"
                                    />
                                ) : product.status === "ON_SALE" && product.platforms.length > 0 ? (
                                    <PlatformShortcutDialog
                                        product={product}
                                        label="바로가기"
                                        variant="management"
                                    />
                                ) : null}
                                <Button
                                    type="button"
                                    variant="ghost"
                                    aria-label="관심 상품 삭제"
                                    disabled={interest.deletePending}
                                    className="h-[52px] w-[52px] flex-col gap-[5px] rounded-none p-[5px] text-[#83889e] hover:bg-transparent hover:text-[#6653fb] disabled:cursor-wait disabled:opacity-50"
                                    onClick={interest.onDelete}
                                >
                                    <Image
                                        src="/sell/actions/interest.svg"
                                        alt=""
                                        width={25}
                                        height={25}
                                        className="size-[25px] shrink-0"
                                    />
                                    <span className="text-[11px] leading-[16px] font-normal tracking-[-0.5px]">
                                        관심 해제
                                    </span>
                                </Button>
                            </>
                        ) : (
                            <>
                                <ProductSummaryActions
                                    product={product}
                                    actionHref={`/sell/manage/${product.id}`}
                                    actionLabel="자세히 보기"
                                    canMarkAsSold={product.status === "ON_SALE"}
                                    showDetails={!isSoldVariant}
                                    middleAction={
                                        product.status === "ON_SALE" ||
                                        product.status === "SOLD_OUT" ? (
                                            <PlatformShortcutDialog
                                                product={product}
                                                label="바로가기"
                                                variant="management"
                                            />
                                        ) : null
                                    }
                                    variant="management"
                                />
                            </>
                        )}
                    </div>
                </div>
            </div>

            {!isSoldVariant ? (
                <>
                    <Separator className="bg-[#d3d3d3]" />
                    <div className="grid h-[96px] grid-cols-[1fr_1px_1fr_1px_1fr] bg-[#fafbff]">
                        <SummaryStat label="판매 시작" value={daysOnSale} />
                        <Separator orientation="vertical" className="h-[54px] self-center" />
                        <SummaryStat label="조회" value={viewCount} />
                        <Separator orientation="vertical" className="h-[54px] self-center" />
                        <SummaryStat
                            label="관심"
                            value={product.interestCount.toLocaleString("ko-KR")}
                        />
                    </div>
                </>
            ) : null}
        </section>
    );
}

export function ProductSummaryCard({ product, interest, variant }: ProductSummaryCardProps) {
    return <ProductSummaryCardFrame product={product} interest={interest} variant={variant} />;
}
