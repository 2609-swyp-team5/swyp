import type { ReactNode } from "react";

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
    DirectStatusPriceStep: () => <div>상태·가격 입력</div>,
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

vi.mock("@/features/sell/components/shared/ExitDialog", () => ({
    ExitDialog: ({ children }: { children?: ReactNode }) => children ?? null,
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
    category: { id: 2, name: "태블릿", parentId: 1 },
    title: "아이패드 프로",
    brand: "Apple",
    description: "수정 전 설명",
    price: 700000,
    status: "ON_SALE",
    condition: "A",
    defectStatus: "NORMAL",
    purchasedAt: "2026-06-27",
    purchasedMonths: 3,
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
        await user.click(screen.getByRole("button", { name: "AI 분석 & 등록" }));

        await waitFor(() => expect(mutateAsync).toHaveBeenCalledTimes(1));

        const [input] = mutateAsync.mock.calls[0] as [
            {
                id: number;
                files: File[];
                request: { imageUrls: string[]; purchasedMonths: number | null };
            },
        ];

        expect(input.id).toBe(42);
        expect(input.files).toEqual([expect.any(File)]);
        expect(input.request.imageUrls).toEqual(["https://example.com/retained.jpg"]);
        expect(input.request.purchasedMonths).toBe(3);
        expect(setQueryData).toHaveBeenCalledWith(["product", 42], {
            ...product,
            title: "수정된 상품명",
        });

        await user.click(screen.getByRole("button", { name: "확인하러 가기" }));

        expect(push).toHaveBeenCalledWith("/sell/manage/42?method=direct");
    });
});
