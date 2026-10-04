import { describe, expect, it } from "vitest";

import { productDetailSummaryResponseSchema } from "./productManagementResponseSchema";

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
