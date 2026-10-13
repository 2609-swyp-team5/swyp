import type { ReactNode } from "react";

import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { ProductDetailSummaryResponse } from "../../schemas/productManagementResponseSchema";

vi.mock("@/features/sell/components/manage/ProductSummaryActions", () => ({
    ProductSummaryActions: ({
        actionLabel,
        canMarkAsSold,
        showDetails = true,
        middleAction,
    }: {
        actionLabel?: string;
        canMarkAsSold?: boolean;
        showDetails?: boolean;
        middleAction?: ReactNode;
    }) => (
        <div>
            {canMarkAsSold ? <button type="button">판매완료</button> : null}
            {showDetails ? <button type="button">{actionLabel ?? "수정하기"}</button> : null}
            {middleAction}
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

        expect(screen.getByText("판매완료")).toHaveClass("bg-[#a9adbd]", "text-white");
        expect(screen.getByText("상품상태")).toBeInTheDocument();
        expect(screen.getByText("구성품")).toBeInTheDocument();
        expect(screen.getByText("상품 설명")).toBeInTheDocument();
        expect(screen.getByRole("button", { name: "바로가기" })).toBeInTheDocument();
        expect(screen.getByRole("button", { name: "자세히 보기" })).toBeInTheDocument();
        expect(screen.getByRole("button", { name: "삭제하기" })).toBeInTheDocument();
        expect(screen.getByText("판매 시작")).toBeInTheDocument();
        expect(screen.getByText("조회")).toBeInTheDocument();
        expect(screen.getByText("관심")).toBeInTheDocument();
    });

    it("판매완료 variant는 기존 카드 구조에서 거래 정보 영역만 변경한다", () => {
        render(<ProductSummaryCard product={soldProduct} variant="sold" />);

        expect(screen.getByText("팔린 플랫폼")).toBeInTheDocument();
        expect(screen.getByText("중고나라")).toBeInTheDocument();
        expect(screen.getByText("최종판매가격")).toBeInTheDocument();
        expect(screen.getByText("450,000원")).toBeInTheDocument();
        expect(screen.queryByText("판매 시작")).not.toBeInTheDocument();
        expect(screen.queryByText("조회")).not.toBeInTheDocument();
        expect(screen.queryByText("관심")).not.toBeInTheDocument();
        expect(screen.queryByText("상품상태")).not.toBeInTheDocument();
        expect(screen.queryByText("상품 설명")).not.toBeInTheDocument();
        expect(screen.queryByRole("button", { name: "자세히 보기" })).not.toBeInTheDocument();
    });

    it("임시저장 상태는 연한 빨간색 상태 뱃지를 보여준다", () => {
        render(<ProductSummaryCard product={{ ...soldProduct, status: "DRAFT" }} />);

        expect(screen.getByText("임시저장")).toHaveClass("bg-[#fff4f4]", "text-[#fa503d]");
    });

    it("관심 상품도 관리 카드 구조를 사용하고 관심 전용 액션을 유지한다", () => {
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

        expect(screen.getByRole("link", { name: "바로가기" })).toHaveAttribute(
            "href",
            "https://example.com/product/3",
        );
        expect(screen.getByText("상품 설명")).toBeInTheDocument();
        expect(screen.getByText("판매 시작")).toBeInTheDocument();
        expect(screen.getByText("관심 해제")).toBeInTheDocument();
        expect(screen.getByRole("button", { name: "관심 상품 삭제" })).toBeInTheDocument();
        expect(screen.queryByRole("button", { name: "바로가기" })).not.toBeInTheDocument();
    });
});
