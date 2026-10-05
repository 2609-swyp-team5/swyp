import { mockProducts } from "@/features/sell/mocks/productMock";
import type { ProductDetailSummaryResponse } from "../schemas/productManagementResponseSchema";

import type {
    ProductCompetition,
    ProductMarketAnalysis,
    AnalysisRecommendation,
    ProductManagementPerspective,
    ProductPriceTrend,
    ProductValuationForecast,
} from "../types";

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

const saleStatsSummary: ProductMarketAnalysis["summary"] = {
    type: "SALE_STATS",
    salesDurationDays: 21,
    viewCount: 128,
    interestCount: 14,
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

export function createProductMarketAnalysisMock(
    productId: number,
    perspective: ProductManagementPerspective = "SELL",
    recommendation?: AnalysisRecommendation,
): ProductMarketAnalysis {
    const isBuyerView = perspective === "BUY";
    const resolvedRecommendation = recommendation ?? (isBuyerView ? "BUY" : "HOLD");
    const summary =
        resolvedRecommendation === "SELL" ? { ...saleStatsSummary } : { ...baseAnalysis.summary };
    const description =
        resolvedRecommendation === "SELL"
            ? "관심과 조회가 충분히 쌓여 지금 판매를 고려해볼 만해요."
            : isBuyerView && resolvedRecommendation === "WAIT"
              ? "최근 가격 변화를 조금 더 지켜보면 더 좋은 구매 시점을 찾을 수 있어요."
              : isBuyerView
                ? "최근 평균 시세보다 낮은 가격이에요. 지금 구매를 고려해볼 만해요."
                : baseAnalysis.description;

    const priceDistribution = isBuyerView
        ? [
              { from: 280000, to: 310000, count: 2 },
              { from: 310000, to: 340000, count: 5 },
              { from: 340000, to: 370000, count: 7 },
              { from: 370000, to: 400000, count: 4 },
              { from: 400000, to: 420000, count: 2 },
          ]
        : baseAnalysis.priceDistribution;

    return {
        ...baseAnalysis,
        recommendation: resolvedRecommendation,
        description,
        ...(isBuyerView
            ? {
                  currentPrice: 320000,
                  suggestedPrice: 320000,
                  minPrice: 280000,
                  averagePrice: 350000,
                  maxPrice: 420000,
                  marketPriceDiffRate: -8.6,
                  marketExpectedPrice: 320000,
              }
            : {}),
        productId,
        priceDistribution: priceDistribution.map((bucket) => ({ ...bucket })),
        summary,
    };
}

export function createProductSummaryMock(productId: number): ProductDetailSummaryResponse {
    const product = mockProducts.find((item) => item.id === productId);

    return {
        id: productId,
        category: {
            id: 1,
            name: product?.categoryName ?? "전자기기",
            parentId: null,
        },
        title: product?.title ?? `상품 ${productId}`,
        price: product?.price ?? 495000,
        status: product?.status ?? "ON_SALE",
        condition: product?.condition ?? "A",
        imageUrls: product?.thumbnailUrl ? [product.thumbnailUrl] : [],
        viewCount: 128,
        interestCount: 14,
        daysOnSale: 21,
        platforms: [],
        createdAt: product?.createdAt ?? "2026-10-02T12:00:00",
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

export function createProductCompetitionMock(
    productId: number,
    perspective: ProductManagementPerspective = "SELL",
): ProductCompetition {
    const sellItems = [
        {
            productId: "external-001",
            platform: "CARROT",
            platformName: "당근마켓",
            imageUrl:
                "https://img.kr.gcp-karroter.net/car/article/fc4f1cd0272ed1102addfcd27279590cb807fcc30dc6916f8936736f9232ec85_1767704949560.png?q=95&s=1440x1440&t=inside&service=web-mixer",
            title: "60만원 의자형마사지기 안마기 안마의자할인!!",
            listingPrice: 19500000,
            marketAveragePrice: 22000000,
            priceDiffRate: -11.36,
            productUrl:
                "https://www.daangn.com/kr/cars/e%ED%81%B4%EB%9E%98%EC%8A%A4-3%EC%84%B8%EB%8C%80-e55-amg-x6cggbasr76o/",
        },
        {
            productId: "external-002",
            platform: "JOONGNA",
            platformName: "중고나라",
            imageUrl:
                "https://img2.joongna.com/media/original/2026/09/23/17901243280321Lf_aZjpZ.jpg?impolicy=thumb&size=150",
            title: "아이패드 프로 5세대 12.9인치 1TB 와이파이모델 + 매직키보드",
            listingPrice: 1100000,
            marketAveragePrice: 1300000,
            priceDiffRate: -15.38,
            productUrl: "https://web.joongna.com/product/232658062",
        },
        {
            productId: "external-003",
            platform: "BUNJANG",
            platformName: "번개장터",
            imageUrl: "https://media.bunjang.co.kr/product/404048469_1_1790312486_w360.jpg",
            title: "아이폰 16/16 pro 헬로키티 케이스",
            listingPrice: 5000,
            marketAveragePrice: 3000,
            priceDiffRate: 66.67,
            productUrl: "https://m.bunjang.co.kr/products/404048469",
        },
    ];

    const buyerItems = [
        {
            productId: "similar-001",
            platform: "CARROT",
            platformName: "당근마켓",
            imageUrl: "",
            title: "아이폰 13미니 128GB",
            listingPrice: 320000,
            marketAveragePrice: 350000,
            priceDiffRate: -8.57,
            productUrl: "https://www.daangn.com/",
        },
        {
            productId: "similar-002",
            platform: "JOONGNA",
            platformName: "중고나라",
            imageUrl: "",
            title: "아이폰 13미니 128GB",
            listingPrice: 320000,
            marketAveragePrice: 350000,
            priceDiffRate: -8.57,
            productUrl: "https://web.joongna.com/",
        },
        {
            productId: "similar-003",
            platform: "BUNJANG",
            platformName: "번개장터",
            imageUrl: "",
            title: "아이폰 13미니 128GB",
            listingPrice: 320000,
            marketAveragePrice: 350000,
            priceDiffRate: -8.57,
            productUrl: "https://m.bunjang.co.kr/",
        },
    ];
    const items = perspective === "BUY" ? buyerItems : sellItems;

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
