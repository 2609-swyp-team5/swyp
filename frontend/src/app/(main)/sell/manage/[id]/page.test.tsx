import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { ProductResponse } from "@/features/sell/types";

const { push, replace, searchParamsValue, useDeleteProductMutation, useProductQuery } = vi.hoisted(
    () => ({
        push: vi.fn(),
        replace: vi.fn(),
        searchParamsValue: { current: "method=direct" },
        useDeleteProductMutation: vi.fn(),
        useProductQuery: vi.fn(),
    }),
);

vi.mock("next/navigation", () => ({
    useParams: () => ({ id: "42" }),
    useRouter: () => ({ push, replace }),
    useSearchParams: () => new URLSearchParams(searchParamsValue.current),
}));

vi.mock("@/features/sell/hooks/queries/useProductQuery", () => ({
    useProductQuery,
}));

vi.mock("@/features/sell/hooks/mutations/useDeleteProductMutation", () => ({
    useDeleteProductMutation,
}));

import ProductReviewPage from "./page";

const product: ProductResponse = {
    id: 42,
    memberId: 1,
    nickname: "판매자",
    category: { id: 3, name: "필름카메라", parentId: 2, leaf: true },
    title: "Nikon FM2 필름카메라 블랙 바디",
    brand: "Nikon",
    description: "깨끗하게 사용한 필름카메라입니다.",
    price: 335000,
    status: "ON_SALE",
    condition: "B",
    defectStatus: "NORMAL",
    purchasedAt: "2026-03-01",
    purchasedMonths: 6,
    includedItems: ["body", "charging-cable"],
    allowPriceSuggestion: true,
    tradeMethod: "DELIVERY",
    deliveryType: "PREPAID",
    preferredTradeRegion: null,
    imageUrls: [
        "https://example.com/product-1.jpg",
        "https://example.com/product-2.jpg",
        "https://example.com/product-3.jpg",
        "https://example.com/product-4.jpg",
        "https://example.com/product-5.jpg",
        "https://example.com/product-6.jpg",
        "https://example.com/product-7.jpg",
    ],
    tags: ["니콘FM2", "필름카메라"],
    recommendation: "HOLD",
    suggestedPrice: 335000,
    analysisDescription: null,
    createdAt: "2026-09-27T14:32:00",
    updatedAt: "2026-09-27T14:32:00",
};

describe("ProductReviewPage", () => {
    beforeEach(() => {
        useProductQuery.mockReturnValue({ data: product, error: null, isPending: false });
        useDeleteProductMutation.mockReturnValue({
            error: null,
            isPending: false,
            mutate: vi.fn(),
            reset: vi.fn(),
        });
        push.mockReset();
        replace.mockReset();
        searchParamsValue.current = "method=direct";
    });

    it("shows the completed registration view with unconnected action buttons", () => {
        render(<ProductReviewPage />);

        expect(
            screen.getByRole("heading", { name: "상품 등록이 완료되었어요!" }),
        ).toBeInTheDocument();
        expect(screen.getAllByText(product.title)).toHaveLength(1);
        expect(screen.getAllByText("335,000원")).toHaveLength(3);
        expect(screen.getByText("별도")).toBeInTheDocument();
        expect(screen.getByText("body, charging-cable")).toBeInTheDocument();
        expect(screen.getByText("#니콘FM2")).toBeInTheDocument();
        expect(screen.getByRole("heading", { name: "판매 타이밍" })).toBeInTheDocument();
        expect(screen.getByText("HOLD")).toBeInTheDocument();
        expect(screen.getByText("판매 보류 추천")).toBeInTheDocument();
        expect(screen.getByText("분석 결과가 없습니다.", { exact: true })).toBeInTheDocument();

        ["가격 분석 자세히 보기", "수정하기", "삭제하기", "판매 상품 관리로 이동"].forEach(
            (name) => {
                expect(screen.getByRole("button", { name })).toHaveAttribute("type", "button");
            },
        );
        expect(screen.queryByRole("button", { name: "상품 보기" })).not.toBeInTheDocument();
        expect(screen.getByRole("button", { name: /^다른 플랫폼에 등록하기$/ })).toHaveAttribute(
            "type",
            "button",
        );
    });

    it("shows the edit completion copy after an update", () => {
        searchParamsValue.current = "method=direct&updated=true";

        render(<ProductReviewPage />);

        expect(
            screen.getByRole("heading", { name: "상품 수정이 완료되었어요!" }),
        ).toBeInTheDocument();
        expect(
            screen.queryByRole("heading", { name: "상품 등록이 완료되었어요!" }),
        ).not.toBeInTheDocument();
        expect(screen.getByText(/수정한 판매글이 정상적으로 등록되었습니다\./)).toBeInTheDocument();
    });

    it("navigates to edit from the product actions", async () => {
        const user = userEvent.setup();

        render(<ProductReviewPage />);

        await user.click(screen.getByRole("button", { name: "수정하기" }));

        expect(push).toHaveBeenCalledWith("/sell/manage/42/edit?method=direct");
    });

    it("navigates to product registration from the next actions", async () => {
        const user = userEvent.setup();

        render(<ProductReviewPage />);

        await user.click(screen.getByRole("button", { name: "새 상품 등록하기" }));

        expect(push).toHaveBeenCalledWith("/sell/register");
    });

    it("changes the main image and expands the remaining thumbnails", async () => {
        const user = userEvent.setup();

        render(<ProductReviewPage />);

        await user.click(screen.getByRole("button", { name: "2번 상품 사진 보기" }));
        expect(
            screen
                .getAllByRole("img", { name: `${product.title} 상품 사진 2` })
                .some((image) => image.className.includes("object-cover")),
        ).toBe(true);

        await user.click(screen.getByRole("button", { name: "추가 상품 사진 4개 보기" }));
        expect(screen.getByText("추가 상품 사진 4개")).toBeVisible();
        expect(screen.getByRole("button", { name: "7번 상품 사진 선택" })).toBeVisible();

        await user.click(screen.getByRole("button", { name: "7번 상품 사진 선택" }));
        expect(screen.getByText("추가 상품 사진 4개")).toBeVisible();
        expect(screen.getByRole("button", { name: "7번 상품 사진 선택" })).toHaveAttribute(
            "aria-pressed",
            "true",
        );

        await user.click(screen.getByRole("button", { name: "상품 사진 팝업 닫기" }));
        expect(screen.queryByText("추가 상품 사진 4개")).not.toBeInTheDocument();
        expect(screen.getByRole("img", { name: `${product.title} 상품 사진 7` })).toHaveClass(
            "object-cover",
        );
    });

    it("opens the selected image in the full-size viewer", async () => {
        const user = userEvent.setup();

        render(<ProductReviewPage />);

        await user.click(
            screen.getByRole("button", { name: `${product.title} 상품 사진 1 크게 보기` }),
        );

        const viewer = screen.getByRole("dialog", {
            name: `${product.title} 상품 사진 크게 보기`,
        });

        expect(viewer).toBeVisible();
        expect(
            screen.getByRole("img", { name: `${product.title} 상품 사진 1 크게 보기` }),
        ).toBeVisible();

        await user.click(screen.getByRole("button", { name: "다음 상품 사진" }));
        expect(
            screen.getByRole("img", { name: `${product.title} 상품 사진 2 크게 보기` }),
        ).toBeVisible();

        await user.click(screen.getByRole("button", { name: "상품 이미지 크게 보기 닫기" }));
        expect(viewer).not.toBeVisible();
        expect(
            screen.getByRole("button", { name: `${product.title} 상품 사진 1 크게 보기` }),
        ).toBeInTheDocument();
    });
});
