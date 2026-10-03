export type AnalysisRecommendation = "SELL" | "HOLD" | "BUY" | "WAIT";

export type PriceDistributionBucket = {
    from: number;
    to: number;
    count: number;
};

export type SaleStatsSummary = {
    type: "SALE_STATS";
    salesDurationDays: number;
    viewCount: number;
    interestCount: number;
    calculatedAt?: string;
};

export type WaitRecommendationSummary = {
    type: "WAIT_RECOMMENDATION";
    waitPeriodDays: number;
    expectedPriceChangeRate: number;
    confidenceScore: number;
};

export type ProductMarketAnalysis = {
    productId: number;
    analysisId: number;
    currentPrice: number;
    suggestedPrice: number;
    recommendation: AnalysisRecommendation;
    description: string;
    minPrice: number;
    averagePrice: number;
    maxPrice: number;
    marketPriceDiffRate: number;
    marketExpectedPrice: number;
    priceDistribution: PriceDistributionBucket[];
    summary: SaleStatsSummary | WaitRecommendationSummary;
    analyzedAt: string;
};

export type ProductMarketAnalysisDataSource = "mock" | "api";
export type ProductManagementPerspective = "SELL" | "BUY";

export type ProductPriceTrendChange = {
    comparedDate: string;
    amount: number;
    rate: number;
};

export type ProductPriceTrend = {
    productId: number;
    priceTrend: {
        period: "1M";
        comparisonBasis: "PREVIOUS_TRADING_DAY";
        totalTransactionCount: number;
        points: Array<{
            date: string;
            averagePrice: number;
            transactionCount: number;
            change: ProductPriceTrendChange | null;
        }>;
    };
};

export type ProductValuationForecast = {
    productId: number;
    valuationForecast: {
        baseDate: string;
        baseValue: number;
        baseValueRate: number;
        forecasts: Array<{
            period: "1M" | "3M" | "6M";
            expectedValue: number;
            expectedValueRate: number;
            expectedChangeRate: number;
        }>;
    };
};

export type ProductTransaction = {
    transactionId: string;
    tradedAt: string;
    price: number;
};

export type ProductTransactions = {
    productId: number;
    period: "30D";
    transactions: ProductTransaction[];
    majorTransactionRange: {
        minPrice: number;
        maxPrice: number;
        transactionCount: number;
    };
};

export type CompetitionLevel = "NONE" | "LOW" | "MEDIUM" | "HIGH";

export type ProductCompetition = {
    productId: number;
    competition: {
        count: number;
        level: CompetitionLevel;
        levelLabel: string;
        items: Array<{
            productId: string;
            platform: string;
            platformName: string;
            imageUrl: string;
            title: string;
            listingPrice: number;
            marketAveragePrice: number;
            priceDiffRate: number;
            productUrl: string;
        }>;
    };
};
