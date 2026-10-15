import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

import type { ProductResponse } from "@/features/sell/types";

const { mutateAsync, push, setQueryData } = vi.hoisted(() => ({
    mutateAsync: vi.fn(),
    push: vi.fn(),
    setQueryData: vi.fn(),
}));

vi.mock("next/navigation", () => ({
    useRouter: () => ({ push }),
}));

vi.mock("@tanstack/react-query", () => ({
    useQueryClient: () => ({ setQueryData }),
}));

vi.mock("@/features/sell/components/direct-register/DirectRegisterInfoStep", () => ({
    DirectRegisterInfoStep: ({
        value,
        onChange,
        onNext,
    }: {
        value: { images: { file: File | null; url: string }[] };
        onChange: (key: "images", images: { file: File | null; url: string }[]) => void;
        onNext: () => void;
    }) => (
        <button
            type="button"
            onClick={() => {
                onChange("images", [
                    { file: null, url: value.images[1].url },
                    {
                        file: new File(["new image"], "new-image.jpg", { type: "image/jpeg" }),
                        url: "blob:new-image.jpg",
                    },
                ]);
                onNext();
            }}
        >
            이미지 변경 후 다음
        </button>
    ),
}));

vi.mock("@/features/sell/components/direct-register/DirectStatusPriceStep", () => ({
    DirectStatusPriceStep: ({
        price,
        errors,
        onPriceChange,
        onTradeMethodChange,
        onDeliveryTypeChange,
        onDeliveryFeeChange,
    }: {
        price: string;
        errors: { price: string };
        onPriceChange: (value: string) => void;
        onTradeMethodChange: (value: "direct" | "delivery") => void;
        onDeliveryTypeChange: (value: "INCLUDED" | "PREPAID") => void;
        onDeliveryFeeChange?: (value: string) => void;
    }) => (
        <>
            <div>상태·가격 입력</div>
            <input
                aria-label="희망 가격"
                value={price}
                onChange={(event) => onPriceChange(event.target.value)}
            />
            {errors.price && <div>{errors.price}</div>}
            <button
                type="button"
                onClick={() => {
                    onTradeMethodChange("delivery");
                    onDeliveryTypeChange("PREPAID");
                    onDeliveryFeeChange?.("3000");
                }}
            >
                배송비 별도 설정
            </button>
        </>
    ),
}));

vi.mock("@/features/sell/components/direct-register/DirectRegisterActions", () => ({
    DirectRegisterActions: ({
        primaryLabel,
        onPrimaryClick,
    }: {
        primaryLabel: string;
        onPrimaryClick?: () => void;
    }) => (
        <button type="button" onClick={onPrimaryClick}>
            {primaryLabel}
        </button>
    ),
}));

vi.mock("@/features/sell/components/ProductRegistrationProcessing", () => ({
    ProductRegistrationProcessing: ({ onGoToManage }: { onGoToManage: () => void }) => (
        <button type="button" onClick={onGoToManage}>
            확인하러 가기
        </button>
    ),
}));

vi.mock("@/features/sell/components/shared/SellAlertDialog", () => ({
    SellAlertDialog: () => null,
}));

vi.mock("@/features/sell/hooks/mutations/useUpdateProductMutation", () => ({
    useUpdateProductMutation: () => ({ mutateAsync }),
}));

vi.mock("@/features/sell/hooks/queries/useProductQuery", () => ({
    productQueryKey: (id: number) => ["product", id],
}));

import { ProductEditForm } from "./ProductEditForm";

const product: ProductResponse = {
    id: 42,
    memberId: 1,
    nickname: "판매자",
    category: { id: 3, name: "아이패드", parentId: 2, leaf: true },
    title: "아이패드 프로",
    brand: "Apple",
    description: "수정 전 설명",
    price: 700000,
    status: "ON_SALE",
    condition: "A",
    includedItems: ["body"],
    allowPriceSuggestion: true,
    tradeMethod: "DIRECT",
    deliveryType: null,
    preferredTradeRegion: "서울 강남구",
    imageUrls: ["https://example.com/removed.jpg", "https://example.com/retained.jpg"],
    tags: ["애플"],
    recommendation: null,
    suggestedPrice: 720000,
    analysisDescription: null,
    platforms: null,
    createdAt: "2026-09-27T00:00:00",
    updatedAt: "2026-09-27T00:00:00",
};

describe("ProductEditForm", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        Object.defineProperty(URL, "revokeObjectURL", {
            configurable: true,
            value: vi.fn(),
        });
        mutateAsync.mockResolvedValue({ ...product, title: "수정된 상품명" });
    });

    afterAll(() => {
        Reflect.deleteProperty(URL, "revokeObjectURL");
    });

    it("separates retained URLs from new image files before submitting an edit", async () => {
        const user = userEvent.setup();

        render(
            <ProductEditForm
                product={product}
                categories={[]}
                categoryStatus="ready"
                method="direct"
            />,
        );

        await user.click(screen.getByRole("button", { name: "이미지 변경 후 다음" }));
        await user.click(screen.getByRole("button", { name: "수정 완료" }));

        await waitFor(() => expect(mutateAsync).toHaveBeenCalledTimes(1));

        const [input] = mutateAsync.mock.calls[0] as [
            {
                id: number;
                files: File[];
                request: { imageUrls: string[]; includedStatus: "NONE" | "PARTIAL" | "ALL" };
            },
        ];

        expect(input.id).toBe(42);
        expect(input.files).toEqual([expect.any(File)]);
        expect(input.request.imageUrls).toEqual(["https://example.com/retained.jpg"]);
        expect(input.request.includedStatus).toBe("ALL");
        expect(input.request).not.toHaveProperty("includedItems");
        expect(input.request).not.toHaveProperty("purchasedMonths");
        expect(input.request).not.toHaveProperty("defectStatus");
        expect(setQueryData).toHaveBeenCalledWith(["product", 42], {
            ...product,
            title: "수정된 상품명",
        });

        await user.click(screen.getByRole("button", { name: "확인하러 가기" }));

        expect(push).toHaveBeenCalledWith("/sell/manage/42?method=direct&updated=true");
    });

    it("reuses the shared trade fields for delivery edits", async () => {
        const user = userEvent.setup();

        render(
            <ProductEditForm
                product={product}
                categories={[]}
                categoryStatus="ready"
                method="direct"
            />,
        );

        await user.click(screen.getByRole("button", { name: "이미지 변경 후 다음" }));
        await user.click(screen.getByRole("button", { name: "배송비 별도 설정" }));
        await user.click(screen.getByRole("button", { name: "수정 완료" }));

        await waitFor(() => expect(mutateAsync).toHaveBeenCalledTimes(1));

        expect(mutateAsync.mock.calls[0][0].request).toMatchObject({
            tradeMethod: "DELIVERY",
            deliveryType: "PREPAID",
            deliveryFee: 3000,
            preferredTradeRegion: null,
        });
    });

    it.each(["499", "100000001"])(
        "rejects an edit price outside the allowed range: %s",
        async (price) => {
            const user = userEvent.setup();

            render(
                <ProductEditForm
                    product={product}
                    categories={[]}
                    categoryStatus="ready"
                    method="direct"
                />,
            );

            await user.click(screen.getByRole("button", { name: "이미지 변경 후 다음" }));
            await user.clear(screen.getByLabelText("희망 가격"));
            await user.type(screen.getByLabelText("희망 가격"), price);
            await user.click(screen.getByRole("button", { name: "수정 완료" }));

            expect(mutateAsync).not.toHaveBeenCalled();
            expect(
                screen.getByText("희망 가격은 500원 이상 1억 원 이하로 입력해 주세요."),
            ).toBeInTheDocument();
        },
    );
});
