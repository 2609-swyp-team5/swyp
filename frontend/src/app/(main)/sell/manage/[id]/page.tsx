"use client";

import { useParams, useSearchParams } from "next/navigation";

import { getApiErrorMessage } from "@/common/lib/api/error";
import { CategoryOptionsNotice } from "@/features/sell/components/manage/CategoryOptionsNotice";
import { CompletionSection } from "@/features/sell/components/manage/CompletionSection";
import { NextActions } from "@/features/sell/components/manage/NextActions";
import { PriceAnalysis } from "@/features/sell/components/manage/PriceAnalysis";
import { ProductDetails } from "@/features/sell/components/manage/ProductDetails";
import { ProductSummary } from "@/features/sell/components/manage/ProductSummary";
import { useProductCompetitionQuery } from "@/features/product-management/hooks/useProductCompetitionQuery";
import { useProductAnalysisQuery } from "@/features/product-management/hooks/useProductAnalysisQuery";
import { useProductQuery } from "@/features/sell/hooks/queries/useProductQuery";

function ReviewStatus({ children }: { children: string }) {
    return (
        <main className="flex flex-1 items-center justify-center bg-white px-6 py-24">
            <p className="typography-body-large text-center font-semibold text-[#6b6c7b]">
                {children}
            </p>
        </main>
    );
}

export default function ProductReviewPage() {
    const params = useParams<{ id: string }>();
    const searchParams = useSearchParams();
    const productId = Number(params.id);
    const registrationMethod = searchParams.get("method") === "direct" ? "direct" : "ai";
    const isUpdated = searchParams.get("updated") === "true";
    const isDetailView = !searchParams.has("method") && !isUpdated;
    const { data: product, error, isPending } = useProductQuery(productId);
    // 등록 때 함께 진행해 저장한 시세 분석(판매자 관점) — 없으면 카드가 사진 기반 AI 추정값을 보여 준다
    const { data: marketAnalysis } = useProductAnalysisQuery(productId);
    const { data: competition } = useProductCompetitionQuery(productId, {
        enabled: Boolean(marketAnalysis),
        perspective: "SELL",
    });

    if (!Number.isInteger(productId) || productId <= 0) {
        return <ReviewStatus>올바르지 않은 상품입니다.</ReviewStatus>;
    }

    if (isPending) {
        return <ReviewStatus>판매글을 불러오는 중이에요.</ReviewStatus>;
    }

    if (error || !product) {
        return <ReviewStatus>{getApiErrorMessage(error)}</ReviewStatus>;
    }

    return (
        <main className="flex flex-1 flex-col bg-white">
            <h1 className="sr-only">판매글 확인</h1>
            <section className="layout-container flex flex-1 flex-col gap-10 pt-6 pb-12 md:gap-[80px] md:pt-16 md:pb-[120px]">
                <CompletionSection isUpdated={isUpdated} isDetailView={isDetailView} />
                <CategoryOptionsNotice
                    product={product}
                    editHref={`/sell/manage/${product.id}/edit?method=${registrationMethod}`}
                />
                <ProductSummary product={product} registrationMethod={registrationMethod} />
                <PriceAnalysis
                    product={product}
                    marketAnalysis={marketAnalysis}
                    competitionCount={competition?.competition.count}
                />
                <ProductDetails product={product} />
                <NextActions productId={product.id} existingPlatforms={product.platforms ?? []} />
            </section>
        </main>
    );
}
