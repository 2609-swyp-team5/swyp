"use client";

import { useParams, useSearchParams } from "next/navigation";

import { getApiErrorMessage } from "@/common/lib/api/error";
import { CompletionSection } from "@/features/sell/components/manage/CompletionSection";
import { NextActions } from "@/features/sell/components/manage/NextActions";
import { PriceAnalysis } from "@/features/sell/components/manage/PriceAnalysis";
import { ProductDetails } from "@/features/sell/components/manage/ProductDetails";
import { ProductSummary } from "@/features/sell/components/manage/ProductSummary";
import { useProductQuery } from "@/features/sell/hooks/queries/useProductQuery";

function ReviewStatus({ children }: { children: string }) {
    return (
        <main className="flex flex-1 items-center justify-center bg-white px-6 py-24">
            <p className="text-center text-lg font-semibold text-[#6b6c7b]">{children}</p>
        </main>
    );
}

export default function ProductReviewPage() {
    const params = useParams<{ id: string }>();
    const searchParams = useSearchParams();
    const productId = Number(params.id);
    const registrationMethod = searchParams.get("method") === "direct" ? "direct" : "ai";
    const isUpdated = searchParams.get("updated") === "true";
    const { data: product, error, isPending } = useProductQuery(productId);

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
            <section className="layout-container flex flex-1 flex-col gap-[80px] pt-10 pb-20 md:pt-16 md:pb-[120px]">
                <CompletionSection isUpdated={isUpdated} />
                <ProductSummary product={product} registrationMethod={registrationMethod} />
                <PriceAnalysis product={product} />
                <ProductDetails product={product} />
                <NextActions productId={product.id} existingPlatforms={product.platforms ?? []} />
            </section>
        </main>
    );
}
