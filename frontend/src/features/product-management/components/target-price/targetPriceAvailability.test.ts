import { describe, expect, it } from "vitest";

import { canSetInterestTargetPrice, canSetSellerTargetPrice } from "./targetPriceAvailability";

describe("target price availability", () => {
    it("판매 관리에서는 임시저장과 판매 중만 허용한다", () => {
        expect(canSetSellerTargetPrice("DRAFT")).toBe(true);
        expect(canSetSellerTargetPrice("ON_SALE")).toBe(true);
        expect(canSetSellerTargetPrice("RESERVED")).toBe(false);
        expect(canSetSellerTargetPrice("SOLD_OUT")).toBe(false);
    });

    it("관심 상품에서는 분석 대기·구매 추천·구매 대기만 허용한다", () => {
        expect(canSetInterestTargetPrice("PENDING")).toBe(true);
        expect(canSetInterestTargetPrice("BUY")).toBe(true);
        expect(canSetInterestTargetPrice("WAIT")).toBe(true);
        expect(canSetInterestTargetPrice("SOLD_OUT")).toBe(false);
    });
});
