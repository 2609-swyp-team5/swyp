import { describe, expect, it } from "vitest";

import { getMyProductsMock } from "./productMock";

describe("getMyProductsMock", () => {
    it("필터링된 목록을 반환해도 전체 상품 기준 상태별 count를 제공한다", async () => {
        const response = await getMyProductsMock("DRAFT");

        expect(response.content).toHaveLength(1);
        expect(response.totalCount).toBe(1);
        expect(response.statusCounts).toEqual({
            DRAFT: 1,
            ON_SALE: 1,
            RESERVED: 0,
            SOLD_OUT: 1,
        });
    });
});
