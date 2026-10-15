import { describe, expect, it } from "vitest";

import type { AiChatAnalysisCard } from "../schemas/aiChatSchema";
import { analysisCardHref, formatChatTime, priceDiffText } from "./aiChatDisplay";

const card: AiChatAnalysisCard = {
    productId: 7,
    source: "OUR",
    mine: true,
    title: "아이폰 16",
    price: 1050000,
    recommendation: "SELL",
    reason: "",
    averagePrice: null,
    analysisStatus: "ANALYZED",
};

describe("aiChatDisplay", () => {
    it("opens my product in sell management and others in the product detail", () => {
        expect(analysisCardHref(card)).toBe("/sell/manage?selected=7");
        expect(analysisCardHref({ ...card, mine: false, source: "EXTERNAL" })).toBe("/search/7");
    });

    it("describes the price against the average", () => {
        expect(priceDiffText(null)).toBe("비교 데이터 부족");
        expect(priceDiffText(0.3)).toBe("평균 수준이에요");
        expect(priceDiffText(-54.2)).toBe("평균보다 54% 낮아요");
        expect(priceDiffText(12.6)).toBe("평균보다 13% 높아요");
    });

    it("formats chat times relative to now within a day", () => {
        const now = new Date("2026-10-15T12:00:00").getTime();
        expect(formatChatTime("2026-10-15T11:59:40", now)).toBe("방금");
        expect(formatChatTime("2026-10-15T11:30:00", now)).toBe("30분 전");
        expect(formatChatTime("2026-10-15T09:00:00", now)).toBe("3시간 전");
        expect(formatChatTime("2026-10-13T09:00:00", now)).toBe("10/13");
    });
});
