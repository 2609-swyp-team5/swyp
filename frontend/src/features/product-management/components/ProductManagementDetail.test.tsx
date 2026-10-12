import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type {
    ProductDetailSummaryResponse,
    ProductManagementOverviewResponse,
} from "../schemas/productManagementResponseSchema";

const { overviewQueryMock, sectionsQueryMock } = vi.hoisted(() => ({
    sectionsQueryMock: vi.fn(),
    overviewQueryMock: vi.fn(),
}));

vi.mock("../hooks/useProductManagementSectionsQuery", () => ({
    useProductManagementSectionsQuery: sectionsQueryMock,
}));
vi.mock("../hooks/useProductManagementOverviewQuery", () => ({
    useProductManagementOverviewQuery: overviewQueryMock,
}));
vi.mock("./product-summary/ProductSummarySkeleton", () => ({
    ProductSummarySkeleton: () => <div data-testid="summary-skeleton" />,
}));
vi.mock("./product-summary/SoldProductSummarySkeleton", () => ({
    SoldProductSummarySkeleton: () => <div data-testid="sold-summary-skeleton" />,
}));
vi.mock("./product-summary/ProductSummaryCard", () => ({
    ProductSummaryCard: () => <div data-testid="full-sold-summary" />,
}));
vi.mock("./product-summary/SoldProductSummaryCard", () => ({
    SoldProductSummaryCard: ({ onDetailsClick }: { onDetailsClick?: () => void }) => (
        <button type="button" onClick={onDetailsClick}>
            판매완료 요약
        </button>
    ),
}));
vi.mock("./analysis/market-analysis/MarketAnalysisSection", () => ({
    MarketAnalysisSection: () => <div data-testid="market-analysis" />,
}));
vi.mock("./competition/ProductCompetitionSection", () => ({
    ProductCompetitionSection: () => <div data-testid="competition" />,
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

const soldProductOverview: ProductManagementOverviewResponse = {
    id: soldProduct.id,
    title: soldProduct.title,
    price: soldProduct.price,
    soldPrice: soldProduct.soldPrice,
    soldPlatform: soldProduct.soldPlatform,
    status: soldProduct.status,
    createdAt: soldProduct.createdAt,
};

function createSections() {
    return {
        productSummary: { data: soldProduct, error: null, isPending: false },
        productAnalysis: { data: null, error: null, isPending: false },
        productPriceTrend: { data: undefined, error: null, isPending: false },
        productValuationForecast: { data: undefined, error: null, isPending: false },
        productCompetition: { data: undefined, error: null, isPending: false },
    };
}

describe("ProductManagementDetail", () => {
    beforeEach(() => {
        sectionsQueryMock.mockReturnValue(createSections());
        overviewQueryMock.mockReturnValue({
            data: soldProductOverview,
            error: null,
            isPending: false,
        });
    });

    it("판매완료 요약 아래에 기존 화면을 자세히 보기로 연다", () => {
        render(<ProductManagementDetail productId={3} initialStatus="SOLD_OUT" />);

        expect(screen.getByRole("button", { name: "판매완료 요약" })).toBeInTheDocument();
        expect(screen.queryByTestId("full-sold-summary")).not.toBeInTheDocument();
        expect(screen.queryByTestId("market-analysis")).not.toBeInTheDocument();
        expect(screen.queryByTestId("competition")).not.toBeInTheDocument();
        expect(overviewQueryMock).toHaveBeenLastCalledWith(3, { enabled: true });
        expect(sectionsQueryMock).toHaveBeenLastCalledWith(3, {
            summaryEnabled: false,
            analysisEnabled: false,
            competitionEnabled: false,
        });

        fireEvent.click(screen.getByRole("button", { name: "판매완료 요약" }));

        expect(screen.getByTestId("full-sold-summary")).toBeInTheDocument();
        expect(screen.getByTestId("market-analysis")).toBeInTheDocument();
        expect(screen.getByTestId("competition")).toBeInTheDocument();
        expect(overviewQueryMock).toHaveBeenLastCalledWith(3, { enabled: false });
        expect(sectionsQueryMock).toHaveBeenLastCalledWith(3, {
            summaryEnabled: true,
            analysisEnabled: true,
            competitionEnabled: true,
        });
    });

    it("판매완료 상품을 불러오는 동안 판매완료 요약 스켈레톤을 보여준다", () => {
        sectionsQueryMock.mockReturnValue({
            ...createSections(),
            productSummary: { data: undefined, error: null, isPending: true },
        });
        overviewQueryMock.mockReturnValue({
            data: undefined,
            error: null,
            isPending: true,
        });

        render(<ProductManagementDetail productId={3} initialStatus="SOLD_OUT" />);

        expect(screen.getByTestId("sold-summary-skeleton")).toBeInTheDocument();
        expect(screen.queryByTestId("summary-skeleton")).not.toBeInTheDocument();
    });
});
