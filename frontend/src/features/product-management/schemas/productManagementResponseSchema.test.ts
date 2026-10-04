import { describe, expect, it } from "vitest";

import {
    productAnalysisResponseSchema,
    productCompetitionResponseSchema,
    productDetailSummaryResponseSchema,
    productPriceTrendResponseSchema,
    productValuationForecastResponseSchema,
} from "./productManagementResponseSchema";

describe("productDetailSummaryResponseSchema", () => {
    it("외부 관심 상품의 상세 요약 응답을 화면 모델로 변환한다", () => {
        const result = productDetailSummaryResponseSchema.parse({
            source: "EXTERNAL",
            id: 42,
            title: "외부 관심 상품",
            brand: null,
            description: null,
            category: {
                id: 1,
                name: "전자기기",
                parentId: null,
                leaf: true,
            },
            price: 1000,
            imageUrls: [],
            tags: [],
            includedItems: [],
            condition: null,
            status: "RESERVED",
            createdAt: "2026-10-04T12:00:00",
            updatedAt: "2026-10-04T12:00:00",
            viewCount: null,
            interestCount: 1,
            daysOnSale: 1,
            platforms: [
                {
                    platformName: "중고나라",
                    productUrl: "https://example.com/item/42",
                },
            ],
        });

        expect(result).toMatchObject({
            id: 42,
            status: "RESERVED",
            condition: null,
            category: {
                id: 1,
                name: "전자기기",
                parentId: null,
            },
            platforms: [
                {
                    platform: "중고나라",
                    platformName: "중고나라",
                    status: "POSTED",
                    productUrl: "https://example.com/item/42",
                },
            ],
        });
    });
});

// 아래 응답은 백엔드 DTO(ProductAnalysisResponse 등)가 실제로 내려주는 형태 — 화면용 필드 외 추가 필드도 함께 온다.
describe("백엔드 분석 응답 파싱", () => {
    it("시세 분석 응답(대기 추천 요약)을 파싱한다", () => {
        const result = productAnalysisResponseSchema.parse({
            productId: 7,
            currentPrice: 500000,
            analysisId: 31,
            minPrice: 400000,
            averagePrice: 450000,
            maxPrice: 520000,
            marketPriceDiffRate: 11.1,
            changeRate: null,
            recommendation: "HOLD",
            suggestedPrice: 470000,
            description: "시세가 오르는 중이에요.",
            buyerRecommendation: "WAIT",
            buyerDescription: "조금 기다려 보세요.",
            analyzedAt: "2026-10-05T06:00:00",
            confidence: "HIGH",
            confidenceRate: 70,
            listingCount: 14,
            waitPeriod: "1M",
            expectedPrice: 468000,
            expectedPriceChangeRate: 0.04,
            forecasts: [{ period: "1M", expectedPrice: 440000 }],
            marketExpectedPrice: 468000,
            priceDistribution: [
                { from: 400000, to: 424000, count: 3 },
                { from: 424000, to: 520000, count: 5 },
            ],
            summary: {
                type: "WAIT_RECOMMENDATION",
                waitPeriodDays: 30,
                expectedPriceChangeRate: 4.0,
                confidenceScore: 70,
            },
        });

        expect(result.summary).toEqual({
            type: "WAIT_RECOMMENDATION",
            waitPeriodDays: 30,
            expectedPriceChangeRate: 4,
            confidenceScore: 70,
        });
        expect(result.priceDistribution).toHaveLength(2);
    });

    it("판매 추천(SELL)이면 판매 현황 요약을 파싱한다", () => {
        const result = productAnalysisResponseSchema.shape.summary.parse({
            type: "SALE_STATS",
            salesDurationDays: 5,
            viewCount: 12,
            interestCount: 3,
        });

        expect(result.type).toBe("SALE_STATS");
    });

    it("가격 추이 응답을 파싱한다", () => {
        const result = productPriceTrendResponseSchema.parse({
            productId: 7,
            currentPrice: 500000,
            priceTrend: {
                period: "1M",
                comparisonBasis: "PREVIOUS_TRADING_DAY",
                totalTransactionCount: 11,
                days: 30,
                from: "2026-09-06",
                to: "2026-10-05",
                averagePrice: 992,
                changeRate: -0.0803,
                points: [
                    {
                        date: "2026-10-03",
                        averagePrice: 1033,
                        transactionCount: 7,
                        minPrice: 800,
                        maxPrice: 1300,
                        analysisCount: 3,
                        change: null,
                    },
                    {
                        date: "2026-10-05",
                        averagePrice: 950,
                        transactionCount: 4,
                        minPrice: 700,
                        maxPrice: 1000,
                        analysisCount: 1,
                        change: { comparedDate: "2026-10-03", amount: -83, rate: -8.03 },
                    },
                ],
            },
        });

        expect(result.priceTrend.points[1].change?.rate).toBe(-8.03);
    });

    it("감가 예측 응답을 파싱한다", () => {
        const result = productValuationForecastResponseSchema.parse({
            productId: 7,
            currentPrice: 500000,
            analysisId: 31,
            analyzedAt: "2026-10-05T06:00:00",
            valuationForecast: {
                baseDate: "2026-10-05",
                baseValue: 3000,
                baseValueRate: 100,
                forecasts: [
                    {
                        period: "1M",
                        expectedValue: 2500,
                        expectedValueRate: 83.33,
                        expectedChangeRate: -16.67,
                    },
                ],
            },
        });

        expect(result.valuationForecast.forecasts[0].expectedChangeRate).toBe(-16.67);
    });

    it("평균 시세가 없는 경쟁 매물(3건 미만)도 파싱한다", () => {
        const result = productCompetitionResponseSchema.parse({
            productId: 7,
            competition: {
                count: 2,
                level: "LOW",
                levelLabel: "낮음",
                items: [
                    {
                        productId: "127646",
                        platform: "BUNJANG",
                        platformName: "번개장터",
                        imageUrl: "",
                        title: "아이폰 13 미니",
                        listingPrice: 320000,
                        marketAveragePrice: null,
                        priceDiffRate: null,
                        productUrl: "https://m.bunjang.co.kr/products/1",
                    },
                ],
            },
        });

        expect(result.competition.items[0].marketAveragePrice).toBeNull();
    });
});
