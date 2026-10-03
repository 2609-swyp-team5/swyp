"use client";

import Image from "next/image";
import { ExternalLink, Heart } from "lucide-react";

import { getApiErrorMessage } from "@/common/lib/api/error";
import { Button } from "@/common/components/ui/Button";
import { clearSelectedProductId } from "@/features/product-management/hooks/useSelectedProductId";
import { useProductManagementSectionsQuery } from "@/features/product-management/hooks/useProductManagementSectionsQuery";
import { MarketAnalysisSection } from "@/features/product-management/components/analysis/market-analysis/MarketAnalysisSection";
import { ProductCompetitionSection } from "@/features/product-management/components/competition/ProductCompetitionSection";
import { ProductTradeHistorySection } from "@/features/product-management/components/analysis/trade-history/ProductTradeHistorySection";
import {
    formatRegisteredAt,
    priceFormatter,
} from "@/features/sell/components/manage/productReviewUtils";
import { useDeleteInterestMutation } from "../hooks/mutations/useDeleteInterestMutation";
import type { InterestListItem } from "../types";

const statusLabels: Record<string, string> = {
    DRAFT: "임시저장",
    ON_SALE: "판매중",
    SOLD_OUT: "판매종료",
};

export function InterestProductDetail({ interest }: { interest: InterestListItem }) {
    const deleteMutation = useDeleteInterestMutation();
    const sections = useProductManagementSectionsQuery(interest.targetId, {
        competitionEnabled: true,
        perspective: "BUY",
    });

    const handleDelete = () => {
        deleteMutation.mutate(interest.interestId, {
            onSuccess: clearSelectedProductId,
        });
    };

    const detailLabel =
        interest.source === "EXTERNAL"
            ? `${interest.platformName ?? "외부 플랫폼"} 매물`
            : (statusLabels[interest.status] ?? interest.status);

    return (
        <div className="flex min-w-0 flex-col gap-6">
            <section
                aria-labelledby="interest-product-detail-title"
                className="rounded-[16px] border border-[#dee5ed] bg-white p-5"
            >
                <div className="grid gap-6 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
                    <div className="relative aspect-square overflow-hidden rounded-[10px] bg-[#f3f3ff]">
                        {interest.thumbnailUrl ? (
                            <Image
                                src={interest.thumbnailUrl}
                                alt={`${interest.title} 상품 이미지`}
                                fill
                                unoptimized
                                sizes="(min-width: 1024px) 40vw, 100vw"
                                className="object-cover"
                            />
                        ) : (
                            <div className="flex size-full items-center justify-center text-[14px] font-semibold text-[#9aa0b0]">
                                상품 이미지 없음
                            </div>
                        )}
                    </div>

                    <div className="flex min-w-0 flex-col py-1">
                        <div className="flex items-center justify-between gap-3">
                            <span className="rounded-full bg-[#fff4f4] px-4 py-1 text-[13px] leading-5 font-semibold text-[#fa503d]">
                                {detailLabel}
                            </span>
                            <button
                                type="button"
                                aria-label="관심 상품 삭제"
                                disabled={deleteMutation.isPending}
                                className="flex items-center gap-1 rounded-full px-3 py-2 text-[12px] leading-5 font-semibold text-[#83889e] transition-colors hover:bg-[#f5f3ff] hover:text-[#6653fb] disabled:cursor-wait disabled:opacity-50"
                                onClick={handleDelete}
                            >
                                <Heart
                                    aria-hidden="true"
                                    className="size-4 fill-[#6653fb] text-[#6653fb]"
                                />
                                관심
                            </button>
                        </div>
                        <p className="mt-2 text-[11px] leading-4 text-[#6b6c7b]">
                            {formatRegisteredAt(interest.createdAt)} 등록
                        </p>
                        <h2
                            id="interest-product-detail-title"
                            className="mt-4 text-[24px] leading-9 font-bold break-keep text-[#363636]"
                        >
                            {interest.title}
                        </h2>
                        <p className="mt-1 text-[26px] leading-9 font-bold text-[#6653fb]">
                            {priceFormatter.format(interest.price)}원
                        </p>
                        <div className="mt-5 flex flex-wrap gap-2.5">
                            <span className="rounded-full border border-[#d3d3d3] bg-[#fafbff] px-4 py-2 text-[13px] leading-5 font-semibold text-[#83889e]">
                                {interest.categoryName}
                            </span>
                            {interest.condition ? (
                                <span className="rounded-full border border-[#d3d3d3] bg-[#fafbff] px-4 py-2 text-[13px] leading-5 font-semibold text-[#6653fb]">
                                    상태 {interest.condition}
                                </span>
                            ) : null}
                        </div>
                        <div className="mt-auto flex items-end justify-end pt-6">
                            {interest.externalUrl ? (
                                <Button
                                    asChild
                                    variant="outline"
                                    className="gap-2 rounded-full border-[#83889e] px-5 text-[#6b6c7b]"
                                >
                                    <a href={interest.externalUrl} target="_blank" rel="noreferrer">
                                        원문 보러가기
                                        <ExternalLink aria-hidden="true" className="size-4" />
                                    </a>
                                </Button>
                            ) : null}
                        </div>
                    </div>
                </div>
                {deleteMutation.error ? (
                    <p className="mt-4 text-right text-[13px] leading-5 text-[#d65353]">
                        {getApiErrorMessage(deleteMutation.error)}
                    </p>
                ) : null}
            </section>

            <MarketAnalysisSection
                result={sections.section2.data}
                error={sections.section2.error}
                isPending={sections.section2.isPending}
                priceTrendQuery={sections.section3}
                valuationForecastQuery={sections.section4}
            />
            <ProductTradeHistorySection query={sections.section5} />
            <ProductCompetitionSection
                query={sections.section6}
                heading="비슷한 상품"
                showCompetitionMeta={false}
            />
        </div>
    );
}
