"use client";

import { formatPrice } from "../analysis/market-analysis/formatters";
import {
    useProductTargetPriceQuery,
    useSetProductTargetPriceMutation,
} from "../../hooks/useProductTargetPrice";
import { TargetPriceCard } from "./TargetPriceCard";

function waitingText(targetPrice: number | null, averagePrice: number | null) {
    if (targetPrice === null) return "";
    if (averagePrice === null) return "시세 분석이 끝나면 목표 판매가와 비교해 알려드려요.";
    return `목표 판매가까지 ${formatPrice(targetPrice - averagePrice)} 남았어요.`;
}

/** 판매 관리 — 내 상품 목표 판매가(최근 시세 분석 평균가가 목표가 이상이 되면 알림). */
export function SellerTargetPriceSection({ productId }: { productId: number }) {
    const query = useProductTargetPriceQuery(productId);
    const mutation = useSetProductTargetPriceMutation(productId);

    if (query.isPending) {
        return (
            <section
                aria-label="목표 판매가"
                className="h-[220px] animate-pulse rounded-[16px] border border-[#dee5ed] bg-[#f8fafc]"
            />
        );
    }
    if (query.error || !query.data) {
        return null;
    }

    const { targetPrice, averagePrice, reached } = query.data;
    return (
        <TargetPriceCard
            key={`${productId}-${targetPrice ?? "none"}`}
            title="목표 판매가"
            description="AI 시세 분석의 평균 시세가 이 금액 이상이 되면 알려드려요."
            targetPrice={targetPrice}
            compareLabel="최근 평균 시세"
            comparePrice={averagePrice}
            reached={reached}
            reachedText="평균 시세가 목표 판매가 이상이에요. 지금 판매를 고려해 보세요."
            waitingText={waitingText(targetPrice, averagePrice)}
            isSaving={mutation.isPending}
            error={mutation.error}
            onSave={(value) => mutation.mutate(value)}
        />
    );
}
