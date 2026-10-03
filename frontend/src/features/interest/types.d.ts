import type { ProductCondition, ProductStatus } from "@/features/sell/types";
import type { CursorPageResponse } from "@/common/lib/api/types";

export type InterestSource = "OUR" | "EXTERNAL";
export type InterestRecommendation = "SELL" | "HOLD" | "BUY" | "WAIT";

export interface InterestListItem {
    interestId: number;
    source: InterestSource;
    targetId: number;
    title: string;
    price: number;
    status: ProductStatus | string;
    condition: ProductCondition | null;
    categoryName: string;
    thumbnailUrl: string | null;
    recommendation: InterestRecommendation | null;
    marketAveragePrice: number | null;
    platformName: string | null;
    externalUrl: string | null;
    targetPrice: number | null;
    createdAt: string;
}

export type InterestListResponse = CursorPageResponse<InterestListItem>;

export interface InterestRegisterInput {
    source: InterestSource;
    targetId: number;
}

export interface InterestCreateResponse {
    interestId: number;
}
