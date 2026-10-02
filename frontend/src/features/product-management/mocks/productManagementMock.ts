import type {
    ProductCompetition,
    ProductMarketAnalysis,
    ProductPriceTrend,
    ProductTransactions,
    ProductValuationForecast,
} from "../types";

export const productManagementMockSource = "mock" as const;

const baseAnalysis: Omit<ProductMarketAnalysis, "productId"> = {
    analysisId: 5,
    currentPrice: 495000,
    suggestedPrice: 468000,
    recommendation: "HOLD",
    description:
        "최근 시장 가격이 점진적으로 상승하고 있고, 유사 상품 등록량이 감소하고 있어요. 조금만 더 기다리면 더 좋은 가격에 판매할 가능성이 있어요.",
    minPrice: 180000,
    averagePrice: 274000,
    maxPrice: 420000,
    marketPriceDiffRate: 4.9,
    marketExpectedPrice: 308000,
    priceDistribution: [
        { from: 180000, to: 220000, count: 2 },
        { from: 220000, to: 260000, count: 4 },
        { from: 260000, to: 300000, count: 7 },
        { from: 300000, to: 360000, count: 5 },
        { from: 360000, to: 420000, count: 3 },
    ],
    summary: {
        type: "WAIT_RECOMMENDATION",
        waitPeriodDays: 14,
        expectedPriceChangeRate: 8,
        confidenceScore: 88,
    },
    analyzedAt: "2026-10-02T12:00:00",
};

type ProductPriceTrendPoint = ProductPriceTrend["priceTrend"]["points"][number];

const priceTrendMockPoints: Array<Omit<ProductPriceTrendPoint, "change">> = [
    { date: "2026-09-02", averagePrice: 259000, transactionCount: 74 },
    { date: "2026-09-03", averagePrice: 260000, transactionCount: 76 },
    { date: "2026-09-04", averagePrice: 258000, transactionCount: 73 },
    { date: "2026-09-05", averagePrice: 261000, transactionCount: 79 },
    { date: "2026-09-06", averagePrice: 262000, transactionCount: 82 },
    { date: "2026-09-07", averagePrice: 260000, transactionCount: 77 },
    { date: "2026-09-08", averagePrice: 263000, transactionCount: 84 },
    { date: "2026-09-09", averagePrice: 264000, transactionCount: 80 },
    { date: "2026-09-10", averagePrice: 262000, transactionCount: 78 },
    { date: "2026-09-11", averagePrice: 265000, transactionCount: 86 },
    { date: "2026-09-12", averagePrice: 264000, transactionCount: 83 },
    { date: "2026-09-13", averagePrice: 266000, transactionCount: 88 },
    { date: "2026-09-14", averagePrice: 267000, transactionCount: 85 },
    { date: "2026-09-15", averagePrice: 265000, transactionCount: 82 },
    { date: "2026-09-16", averagePrice: 268000, transactionCount: 90 },
    { date: "2026-09-17", averagePrice: 269000, transactionCount: 89 },
    { date: "2026-09-18", averagePrice: 267000, transactionCount: 86 },
    { date: "2026-09-19", averagePrice: 270000, transactionCount: 93 },
    { date: "2026-09-20", averagePrice: 271000, transactionCount: 91 },
    { date: "2026-09-21", averagePrice: 270000, transactionCount: 88 },
    { date: "2026-09-22", averagePrice: 272000, transactionCount: 95 },
    { date: "2026-09-23", averagePrice: 271000, transactionCount: 90 },
    { date: "2026-09-24", averagePrice: 273000, transactionCount: 96 },
    { date: "2026-09-25", averagePrice: 274000, transactionCount: 94 },
    { date: "2026-09-26", averagePrice: 272000, transactionCount: 92 },
    { date: "2026-09-27", averagePrice: 275000, transactionCount: 98 },
    { date: "2026-09-28", averagePrice: 274000, transactionCount: 95 },
    { date: "2026-09-29", averagePrice: 276000, transactionCount: 100 },
    { date: "2026-09-30", averagePrice: 275000, transactionCount: 97 },
    { date: "2026-10-01", averagePrice: 276000, transactionCount: 101 },
];

export function createProductMarketAnalysisMock(productId: number): ProductMarketAnalysis {
    return {
        ...baseAnalysis,
        productId,
        priceDistribution: baseAnalysis.priceDistribution.map((bucket) => ({ ...bucket })),
        summary: { ...baseAnalysis.summary },
    };
}

export function createProductPriceTrendMock(productId: number): ProductPriceTrend {
    const points = priceTrendMockPoints.map((point, index) => {
        const previousPoint = priceTrendMockPoints[index - 1];

        return {
            ...point,
            change: previousPoint
                ? {
                      comparedDate: previousPoint.date,
                      amount: point.averagePrice - previousPoint.averagePrice,
                      rate: Number(
                          (
                              ((point.averagePrice - previousPoint.averagePrice) /
                                  previousPoint.averagePrice) *
                              100
                          ).toFixed(2),
                      ),
                  }
                : null,
        };
    });

    return {
        productId,
        priceTrend: {
            period: "1M",
            comparisonBasis: "PREVIOUS_TRADING_DAY",
            totalTransactionCount: points.reduce(
                (total, point) => total + point.transactionCount,
                0,
            ),
            points,
        },
    };
}

export function createProductValuationForecastMock(productId: number): ProductValuationForecast {
    return {
        productId,
        valuationForecast: {
            baseDate: "2026-10-02",
            baseValue: 274000,
            baseValueRate: 100,
            forecasts: [
                {
                    period: "1M",
                    expectedValue: 266000,
                    expectedValueRate: 97.08,
                    expectedChangeRate: -2.92,
                },
                {
                    period: "3M",
                    expectedValue: 251000,
                    expectedValueRate: 91.61,
                    expectedChangeRate: -8.39,
                },
                {
                    period: "6M",
                    expectedValue: 232000,
                    expectedValueRate: 84.67,
                    expectedChangeRate: -15.33,
                },
            ],
        },
    };
}

export function createProductTransactionsMock(productId: number): ProductTransactions {
    return {
        productId,
        period: "30D",
        transactions: [
            { transactionId: "tx-001", tradedAt: "2026-09-05T10:30:00+09:00", price: 265000 },
            { transactionId: "tx-002", tradedAt: "2026-09-08T14:20:00+09:00", price: 278000 },
            { transactionId: "tx-003", tradedAt: "2026-09-15T16:10:00+09:00", price: 274000 },
        ],
        majorTransactionRange: {
            minPrice: 265000,
            maxPrice: 278000,
            transactionCount: 18,
        },
    };
}

export function createProductCompetitionMock(productId: number): ProductCompetition {
    const items = [
        {
            productId: "external-001",
            platform: "CARROT",
            platformName: "당근마켓",
            imageUrl: "https://example.com/image1.jpg",
            title: "아이패드 프로 11인치 4세대",
            listingPrice: 320000,
            marketAveragePrice: 350000,
            priceDiffRate: -8.57,
            productUrl: "https://example.com/products/1",
        },
        {
            productId: "external-002",
            platform: "JOONGNA",
            platformName: "중고나라",
            imageUrl: "https://example.com/image2.jpg",
            title: "아이패드 프로 11인치 4세대",
            listingPrice: 320000,
            marketAveragePrice: 350000,
            priceDiffRate: -8.57,
            productUrl: "https://example.com/products/2",
        },
        {
            productId: "external-003",
            platform: "BUNJANG",
            platformName: "번개장터",
            imageUrl: "https://example.com/image3.jpg",
            title: "아이패드 프로 11인치 4세대",
            listingPrice: 320000,
            marketAveragePrice: 350000,
            priceDiffRate: -8.57,
            productUrl: "https://example.com/products/3",
        },
    ];

    return {
        productId,
        competition: {
            count: items.length,
            level: "LOW",
            levelLabel: "낮음",
            items,
        },
    };
}
