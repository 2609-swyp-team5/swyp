"use client";

import { useEffect, useState } from "react";

import { useNotificationSettingsQuery } from "@/features/notifications/hooks/queries/useNotificationSettingsQuery";
import {
    useProductTargetPriceQuery,
    useSetProductTargetPriceMutation,
} from "../../hooks/useProductTargetPrice";
import { ManagementTargetPriceCard } from "./ManagementTargetPriceCard";
import { TargetPriceSaveToast } from "./TargetPriceSaveToast";

/** 판매 관리 — 내 상품 목표 판매가(최근 시세 분석 평균가가 목표가 이상이 되면 알림). */
export function SellerTargetPriceSection({ productId }: { productId: number }) {
    const query = useProductTargetPriceQuery(productId);
    const mutation = useSetProductTargetPriceMutation(productId);
    const notificationSettingsQuery = useNotificationSettingsQuery();
    const [savedTargetPrice, setSavedTargetPrice] = useState<number | null>(null);

    useEffect(() => {
        if (savedTargetPrice === null) {
            return;
        }

        const timer = window.setTimeout(() => setSavedTargetPrice(null), 2500);
        return () => window.clearTimeout(timer);
    }, [savedTargetPrice]);

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

    const { targetPrice, averagePrice } = query.data;
    return (
        <>
            {savedTargetPrice !== null ? (
                <TargetPriceSaveToast targetPrice={savedTargetPrice} />
            ) : null}
            <ManagementTargetPriceCard
                key={`${productId}-${targetPrice ?? "none"}`}
                title="목표 판매가"
                description="AI 시세 분석의 평균 시세가 이 금액 이상이 되면 알려드려요."
                targetPrice={targetPrice}
                reference={{ label: "최근 평균 시세", price: averagePrice }}
                isSaving={mutation.isPending}
                error={mutation.error}
                onSave={(value) =>
                    mutation.mutate(value, {
                        onSuccess: (data) => setSavedTargetPrice(data.targetPrice),
                    })
                }
                targetPriceNotificationEnabled={notificationSettingsQuery.data?.targetPriceEnabled}
            />
        </>
    );
}
