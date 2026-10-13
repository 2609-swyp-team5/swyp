import type { ProductSummaryResponse } from "@/features/sell/types";

export type SellerRecommendationBadge = "SELL" | "HOLD" | "PENDING";

export function resolveSellerRecommendationBadge(
    recommendation: ProductSummaryResponse["recommendation"],
): SellerRecommendationBadge {
    if (recommendation === "SELL" || recommendation === "HOLD") {
        return recommendation;
    }

    return "PENDING";
}
