"use client";

import { useState } from "react";

import Image from "next/image";

import { getApiErrorMessage } from "@/common/lib/api/error";
import { Button } from "@/common/components/ui/Button";
import { ArrowUpRight, ExternalLink, Globe2, X } from "lucide-react";
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogTitle,
    DialogTrigger,
} from "@/common/components/ui/Dialog";
import { ProductGallery } from "@/features/sell/components/manage/ProductGallery";
import { ProductSummaryActions } from "@/features/sell/components/manage/ProductSummaryActions";
import { useProductQuery } from "@/features/sell/hooks/queries/useProductQuery";
import type { ProductPlatform, ProductResponse } from "@/features/sell/types";
import {
    conditionLabels,
    formatRegisteredAt,
    priceFormatter,
    statusLabels,
} from "@/features/sell/components/manage/productReviewUtils";

function ProductSummarySkeleton() {
    return (
        <section
            aria-label="상품 정보를 불러오는 중"
            className="grid min-h-[430px] animate-pulse gap-6 rounded-[16px] border border-[#dee5ed] bg-white p-5 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]"
        >
            <div className="flex min-w-0 flex-col gap-3">
                <div className="aspect-[1.15] w-full rounded-[10px] bg-[#eef0f5]" />
                <div className="grid grid-cols-4 gap-2">
                    {Array.from({ length: 4 }, (_, index) => (
                        <div key={index} className="aspect-square rounded-lg bg-[#f4f5f8]" />
                    ))}
                </div>
            </div>
            <div className="flex min-w-0 flex-col gap-4 py-1">
                <div className="h-6 w-24 rounded-full bg-[#eef0f5]" />
                <div className="h-8 w-4/5 rounded bg-[#eef0f5]" />
                <div className="h-8 w-2/5 rounded bg-[#eef0f5]" />
                <div className="mt-3 flex gap-2.5">
                    <div className="h-9 w-28 rounded-full bg-[#f4f5f8]" />
                    <div className="h-9 w-24 rounded-full bg-[#f4f5f8]" />
                </div>
                <div className="mt-auto flex items-end justify-between gap-4">
                    <div className="h-9 w-28 rounded-[6px] bg-[#f4f5f8]" />
                    <div className="flex items-end gap-[30px]">
                        {Array.from({ length: 2 }, (_, index) => (
                            <div key={index} className="flex flex-col items-center gap-2">
                                <div className="size-10 rounded-full bg-[#eef0f5]" />
                                <div className="h-4 w-14 rounded bg-[#f4f5f8]" />
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
}

const platformStatusLabels: Record<ProductPlatform["status"], string> = {
    POSTING: "등록 중",
    POSTED: "게시됨",
    FAILED: "등록 실패",
    REMOVED: "내려감",
};

const platformIconPaths: Record<string, string> = {
    BUNJANG: "/my/home/bunjang.svg",
    번개장터: "/my/home/bunjang.svg",
    DAANGN: "/my/home/daangn.svg",
    당근마켓: "/my/home/daangn.svg",
    JOONGGONARA: "/my/home/joonggonara.png",
    중고나라: "/my/home/joonggonara.png",
};

function PlatformShortcutDialog({ product }: { product: ProductResponse }) {
    const [isOpen, setIsOpen] = useState(false);
    const platforms = product.platforms ?? [];

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button
                    type="button"
                    variant="outline"
                    className="h-9 gap-1.5 rounded-[6px] border-[#dee5ed] px-3 text-[12px] text-[#6b6c7b] hover:bg-[#f5f3ff]"
                >
                    <ExternalLink aria-hidden="true" className="size-3.5" />
                    상품 바로가기
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-sm gap-5 rounded-[16px] border-[#dee5ed] p-6">
                <DialogClose
                    aria-label="플랫폼 선택 닫기"
                    className="absolute top-4 right-4 rounded-md p-1 text-[#83889e] transition-colors hover:bg-[#f5f3ff] hover:text-[#6653fb]"
                >
                    <X aria-hidden="true" className="size-4" />
                </DialogClose>
                <div className="space-y-1 pr-6">
                    <DialogTitle className="text-[18px] leading-7 font-bold text-[#363636]">
                        상품 바로가기
                    </DialogTitle>
                    <DialogDescription className="text-[13px] leading-5 text-[#83889e]">
                        이동할 플랫폼을 선택해 주세요.
                    </DialogDescription>
                </div>

                {platforms.length > 0 ? (
                    <div className="flex flex-col gap-2">
                        {platforms.map((platform) => {
                            const canOpen =
                                platform.status === "POSTED" && Boolean(platform.productUrl);
                            const platformLabel = platform.platformName || platform.platform;
                            const platformIcon =
                                platformIconPaths[platform.platform] ??
                                platformIconPaths[platform.platformName];
                            const itemClassName =
                                "flex items-center justify-between rounded-[10px] border px-3 py-2.5 text-left transition-colors";

                            if (!canOpen) {
                                return (
                                    <div
                                        key={`${platform.platform}-${platform.externalProductId ?? "unknown"}`}
                                        aria-disabled="true"
                                        className={`${itemClassName} cursor-not-allowed border-[#eef0f5] bg-[#fafbfc] text-[#9aa0b0]`}
                                    >
                                        <div className="flex min-w-0 items-center gap-3">
                                            {platformIcon ? (
                                                <Image
                                                    src={platformIcon}
                                                    alt=""
                                                    width={32}
                                                    height={32}
                                                    className="size-8 shrink-0 rounded-[8px] object-contain grayscale"
                                                />
                                            ) : (
                                                <span className="flex size-8 shrink-0 items-center justify-center rounded-[8px] bg-[#eef0f5] text-[#9aa0b0]">
                                                    <Globe2 aria-hidden="true" className="size-4" />
                                                </span>
                                            )}
                                            <span className="truncate text-[14px] leading-5 font-semibold">
                                                {platformLabel}
                                            </span>
                                        </div>
                                        <span className="text-[12px] leading-5">
                                            {platformStatusLabels[platform.status]}
                                        </span>
                                    </div>
                                );
                            }

                            return (
                                <DialogClose key={platform.productUrl} asChild>
                                    <a
                                        href={platform.productUrl ?? undefined}
                                        target="_blank"
                                        rel="noreferrer"
                                        className={`${itemClassName} border-[#dedee6] text-[#363636] hover:border-[#6653fb] hover:bg-[#f8f7ff]`}
                                    >
                                        <div className="flex min-w-0 items-center gap-3">
                                            {platformIcon ? (
                                                <Image
                                                    src={platformIcon}
                                                    alt=""
                                                    width={32}
                                                    height={32}
                                                    className="size-8 shrink-0 rounded-[8px] object-contain"
                                                />
                                            ) : (
                                                <span className="flex size-8 shrink-0 items-center justify-center rounded-[8px] bg-[#f5f3ff] text-[#6653fb]">
                                                    <Globe2 aria-hidden="true" className="size-4" />
                                                </span>
                                            )}
                                            <span className="truncate text-[14px] leading-5 font-semibold">
                                                {platformLabel}
                                            </span>
                                        </div>
                                        <span className="flex items-center gap-1 text-[12px] leading-5 font-medium text-[#6653fb]">
                                            바로가기
                                            <ArrowUpRight aria-hidden="true" className="size-3.5" />
                                        </span>
                                    </a>
                                </DialogClose>
                            );
                        })}
                    </div>
                ) : (
                    <p className="rounded-[10px] bg-[#fafbfc] px-4 py-6 text-center text-[13px] leading-5 text-[#83889e]">
                        연동된 플랫폼이 없습니다.
                    </p>
                )}
            </DialogContent>
        </Dialog>
    );
}

function ProductSummaryCard({ product }: { product: ProductResponse }) {
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

export function ProductSummaryDetail({ productId }: { productId: number }) {
    const { data, error, isPending } = useProductQuery(productId);

    if (isPending) {
        return <ProductSummarySkeleton />;
    }

    if (error || !data) {
        return (
            <section className="flex min-h-[430px] items-center justify-center rounded-[16px] border border-[#dee5ed] bg-white p-6 text-center">
                <p className="text-[14px] leading-6 font-medium text-[#d65353]">
                    {getApiErrorMessage(error)}
                </p>
            </section>
        );
    }

    return <ProductSummaryCard product={data} />;
}
