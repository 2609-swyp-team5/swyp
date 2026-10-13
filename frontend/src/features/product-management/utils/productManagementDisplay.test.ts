import { describe, expect, it } from "vitest";

import { resolveSellerRecommendationBadge } from "./productManagementDisplay";

describe("resolveSellerRecommendationBadge", () => {
    it.each([
        ["SELL", "SELL"],
        ["HOLD", "HOLD"],
    ] as const)("keeps %s as the seller badge", (recommendation, expected) => {
        expect(resolveSellerRecommendationBadge(recommendation)).toBe(expected);
    });

    it.each(["BUY", "WAIT", null] as const)(
        "normalizes %s to PENDING for seller management",
        (recommendation) => {
            expect(resolveSellerRecommendationBadge(recommendation)).toBe("PENDING");
        },
    );
});
