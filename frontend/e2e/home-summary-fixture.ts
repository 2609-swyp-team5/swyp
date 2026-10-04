import type { HomeSummaryResponse } from "../src/features/home/types";

export const homeSummary: HomeSummaryResponse = {
    productCount: 6,
    productStatusCounts: { DRAFT: 2, ON_SALE: 2, RESERVED: 1, SOLD_OUT: 1 },
    interestCount: 4,
    todayRecommendationCount: 3,
    marketPriceDiffRate: -2.5,
    analyzedProductCount: 3,
    lastAnalyzedAt: "2026-10-03T09:12:00",
};

export const emptyHomeSummary: HomeSummaryResponse = {
    productCount: 0,
    productStatusCounts: { DRAFT: 0, ON_SALE: 0, RESERVED: 0, SOLD_OUT: 0 },
    interestCount: 0,
    todayRecommendationCount: 0,
    marketPriceDiffRate: null,
    analyzedProductCount: 0,
    lastAnalyzedAt: null,
};
