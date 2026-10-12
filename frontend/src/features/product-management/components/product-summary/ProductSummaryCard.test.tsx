import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { ProductDetailSummaryResponse } from "../../schemas/productManagementResponseSchema";

vi.mock("@/features/sell/components/manage/ProductSummaryActions", () => ({
    ProductSummaryActions: ({
        actionLabel,
        canMarkAsSold,
    }: {
        actionLabel?: string;
        canMarkAsSold?: boolean;
    }) => (
        <div>
            {canMarkAsSold ? <button type="button">판매완료</button> : null}
            <button type="button">{actionLabel ?? "수정하기"}</button>
            <button type="button">삭제하기</button>
        </div>
    ),
}));

import { ProductSummaryCard } from "./ProductSummaryCard";

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

describe("ProductSummaryCard", () => {
    it("관리 상품 상세 카드는 Figma 정보 행과 세 가지 하단 액션을 보여준다", () => {
        render(<ProductSummaryCard product={soldProduct} />);

        expect(screen.getByText("판매완료")).toBeInTheDocument();
        expect(screen.getByText("상품상태")).toBeInTheDocument();
        expect(screen.getByText("구성품")).toBeInTheDocument();
        expect(screen.getByText("상품 설명")).toBeInTheDocument();
        expect(screen.getByRole("button", { name: "바로가기" })).toBeInTheDocument();
        expect(screen.getByRole("button", { name: "자세히 보기" })).toBeInTheDocument();
        expect(screen.getByRole("button", { name: "삭제하기" })).toBeInTheDocument();
        expect(screen.getByText("판매 시작")).toBeInTheDocument();
        expect(screen.getByText("조회")).toBeInTheDocument();
        expect(screen.getByText("관심")).toBeInTheDocument();
        expect(screen.queryByText("팔린 플랫폼")).not.toBeInTheDocument();
        expect(screen.queryByText("최종판매가격")).not.toBeInTheDocument();
        expect(screen.queryByRole("button", { name: "판매완료" })).not.toBeInTheDocument();
    });

    it("관심 상품은 상단에 판매글 바로가기를 표시하고 관심 액션을 하단으로 이동한다", () => {
        render(
            <ProductSummaryCard
                product={{ ...soldProduct, status: "ON_SALE", platforms: [] }}
                interest={{
                    detailLabel: "번개장터 매물",
                    platformName: "번개장터",
                    externalUrl: "https://example.com/product/3",
                    deletePending: false,
                    onDelete: vi.fn(),
                }}
            />,
        );

        expect(screen.getByRole("link", { name: "판매글 바로가기" })).toHaveAttribute(
            "href",
            "https://example.com/product/3",
        );
        expect(screen.getByRole("button", { name: "관심 상품 삭제" })).toBeInTheDocument();
        expect(screen.queryByText("바로가기")).not.toBeInTheDocument();
    });
});
