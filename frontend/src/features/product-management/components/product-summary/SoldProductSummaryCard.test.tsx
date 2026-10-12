import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { ProductDetailSummaryResponse } from "../../schemas/productManagementResponseSchema";
import { SoldProductSummaryCard } from "./SoldProductSummaryCard";

const soldProduct: ProductDetailSummaryResponse = {
    source: "OUR",
    id: 3,
    title: "아이폰 13 미니 128GB",
    brand: null,
    description: null,
    price: 320000,
    soldPrice: 450000,
    soldPlatform: "중고나라",
    status: "SOLD_OUT",
    createdAt: "2026-09-15T10:00:00",
    category: { id: 1, name: "전자기기", parentId: null, leaf: true },
    condition: "A",
    tradeMethod: "DELIVERY",
    deliveryType: "INCLUDED",
    imageUrls: [],
    tags: [],
    includedItems: [],
    viewCount: 128,
    interestCount: 14,
    daysOnSale: 21,
    platforms: [],
    updatedAt: "2026-09-15T10:00:00",
};

describe("SoldProductSummaryCard", () => {
    it("판매완료 요약과 자세히 보기만 먼저 보여준다", () => {
        const onDetailsClick = vi.fn();

        render(<SoldProductSummaryCard product={soldProduct} onDetailsClick={onDetailsClick} />);

        expect(screen.getByText("판매완료")).toBeInTheDocument();
        expect(screen.getByText("팔린 플랫폼")).toBeInTheDocument();
        expect(screen.getByText("중고나라")).toBeInTheDocument();
        expect(screen.getByText("450,000원")).toBeInTheDocument();
        expect(screen.getByRole("heading", { name: soldProduct.title })).toHaveAttribute(
            "id",
            "sold-product-summary-title",
        );

        fireEvent.click(screen.getByRole("button", { name: "자세히 보기" }));
        expect(onDetailsClick).toHaveBeenCalledOnce();
    });
});
