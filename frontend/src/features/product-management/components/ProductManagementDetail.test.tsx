import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { ProductDetailSummaryResponse } from "../schemas/productManagementResponseSchema";

const { sectionsQueryMock } = vi.hoisted(() => ({
    sectionsQueryMock: vi.fn(),
}));

vi.mock("../hooks/useProductManagementSectionsQuery", () => ({
    useProductManagementSectionsQuery: sectionsQueryMock,
}));
vi.mock("../hooks/useUpdateProductPriceMutation", () => ({
    useUpdateProductPriceMutation: () => ({
        isPending: false,
        mutateAsync: vi.fn(),
    }),
}));
vi.mock("../hooks/useRequestProductAnalysisMutation", () => ({
    useRequestProductAnalysisMutation: () => ({
        isPending: false,
        mutateAsync: vi.fn(),
    }),
}));
vi.mock("./product-summary/ProductSummarySkeleton", () => ({
    ProductSummarySkeleton: () => <div data-testid="summary-skeleton" />,
}));
vi.mock("./product-summary/ProductSummaryCard", () => ({
    ProductSummaryCard: () => <div data-testid="full-sold-summary" />,
}));
vi.mock("./analysis/market-analysis/MarketAnalysisSection", () => ({
    MarketAnalysisSection: ({
        onDetailsOpenChange,
        isDetailsOpen,
        competitionQuery,
        variant,
    }: {
        onDetailsOpenChange?: (open: boolean) => void;
        isDetailsOpen?: boolean;
        competitionQuery?: unknown;
        variant?: string;
    }) => (
        <>
            <button
                type="button"
                data-testid="market-analysis"
                onClick={() => onDetailsOpenChange?.(true)}
            >
                상세 시세 분석 보기
            </button>
            {isDetailsOpen && competitionQuery && variant !== "sold" ? (
                <div data-testid="competition" />
            ) : null}
        </>
    ),
}));
vi.mock("./target-price/SellerTargetPriceSection", () => ({
    SellerTargetPriceSection: () => <div data-testid="target-price" />,
}));

import { ProductManagementDetail } from "./ProductManagementDetail";

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

function createSections() {
    return {
        productSummary: { data: soldProduct, error: null, isPending: false },
        productAnalysis: { data: null, error: null, isPending: false },
        productAnalysisEmptyState: { data: null },
        productPriceTrend: { data: undefined, error: null, isPending: false },
        productValuationForecast: { data: undefined, error: null, isPending: false },
        productCompetition: { data: undefined, error: null, isPending: false },
    };
}

describe("ProductManagementDetail", () => {
    beforeEach(() => {
        sectionsQueryMock.mockReturnValue(createSections());
    });

    it("판매완료 상품은 상세 카드와 접힌 시세 분석을 함께 보여준다", () => {
        render(<ProductManagementDetail productId={3} initialStatus="SOLD_OUT" />);

        expect(screen.getByTestId("full-sold-summary")).toBeInTheDocument();
        expect(screen.getByTestId("market-analysis")).toBeInTheDocument();
        expect(screen.queryByTestId("competition")).not.toBeInTheDocument();
        expect(sectionsQueryMock).toHaveBeenLastCalledWith(3, {
            summaryEnabled: true,
            analysisEnabled: false,
            analysisDetailsEnabled: false,
            competitionEnabled: false,
        });

        fireEvent.click(screen.getByTestId("market-analysis"));

        expect(screen.queryByTestId("competition")).not.toBeInTheDocument();
        expect(sectionsQueryMock).toHaveBeenLastCalledWith(3, {
            summaryEnabled: true,
            analysisEnabled: true,
            analysisDetailsEnabled: true,
            competitionEnabled: false,
        });
    });

    it("판매완료 상품을 불러오는 동안 판매완료 요약 스켈레톤을 보여준다", () => {
        sectionsQueryMock.mockReturnValue({
            ...createSections(),
            productSummary: { data: undefined, error: null, isPending: true },
        });

        render(<ProductManagementDetail productId={3} initialStatus="SOLD_OUT" />);

        expect(screen.getByTestId("summary-skeleton")).toBeInTheDocument();
    });
});
