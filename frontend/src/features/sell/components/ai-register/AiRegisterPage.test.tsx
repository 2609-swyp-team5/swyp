import type { ReactNode } from "react";

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

const { mutate, push } = vi.hoisted(() => ({
    mutate: vi.fn(),
    push: vi.fn(),
}));

vi.mock("next/navigation", () => ({
    useRouter: () => ({ push }),
}));

vi.mock("@/features/sell/components/ai-register/AiRegisterUploadStep", () => ({
    AiRegisterUploadStep: ({
        onImagesChange,
        children,
    }: {
        onImagesChange: (images: { file: File; url: string }[]) => void;
        children: ReactNode;
    }) => (
        <div>
            <button
                type="button"
                onClick={() =>
                    onImagesChange([
                        {
                            file: new File(["image"], "camera.png", { type: "image/png" }),
                            url: "blob:camera.png",
                        },
                    ])
                }
            >
                테스트 사진 추가
            </button>
            {children}
        </div>
    ),
}));

vi.mock("@/features/sell/components/ai-register/AiRegisterAdditionalInfoStep", () => ({
    AiRegisterAdditionalInfoStep: ({
        onProductConditionChange,
        onIncludedStatusChange,
        onTradeMethodChange,
        onDeliveryTypeChange,
        children,
    }: {
        onProductConditionChange: (value: "A") => void;
        onIncludedStatusChange: (value: "partial") => void;
        onTradeMethodChange: (value: "delivery") => void;
        onDeliveryTypeChange: (value: "INCLUDED") => void;
        children: ReactNode;
    }) => (
        <div>
            <button type="button" onClick={() => onProductConditionChange("A")}>
                거의 새 상품
            </button>
            <button type="button" onClick={() => onIncludedStatusChange("partial")}>
                일부 포함
            </button>
            <button type="button" onClick={() => onTradeMethodChange("delivery")}>
                택배 거래
            </button>
            <button type="button" onClick={() => onDeliveryTypeChange("INCLUDED")}>
                배송비 포함
            </button>
            {children}
        </div>
    ),
}));

vi.mock("@/features/sell/hooks/mutations/useCreateAiProductMutation", () => ({
    useCreateAiProductMutation: (callbacks?: {
        onSuccess?: (product: { id: number }) => void;
    }) => ({
        mutate: (input: unknown) => {
            mutate(input);
            callbacks?.onSuccess?.({ id: 17 });
        },
    }),
}));

import { AiRegisterPage } from "./AiRegisterPage";

describe("AiRegisterPage", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        Object.defineProperty(URL, "revokeObjectURL", {
            configurable: true,
            value: vi.fn(),
        });
    });

    afterAll(() => {
        Reflect.deleteProperty(URL, "revokeObjectURL");
    });

    it("submits the selected images and additional information, then opens the review page", async () => {
        const user = userEvent.setup();

        render(<AiRegisterPage />);

        const stepper = screen.getByRole("list", { name: "상품 등록 단계" });
        const photoStep = screen.getByText("사진 등록");
        const additionalInfoStep = screen.getByText("추가 정보 입력");
        expect(stepper).toContainElement(photoStep);
        expect(stepper).toContainElement(additionalInfoStep);
        expect(photoStep).toHaveClass("text-[#6653fb]");
        expect(additionalInfoStep).toHaveClass("text-[#d3d3d3]");
        await user.click(screen.getByRole("button", { name: "테스트 사진 추가" }));
        await user.click(screen.getByRole("button", { name: "다음단계" }));
        expect(photoStep).toHaveClass("text-[#6653fb]");
        expect(additionalInfoStep).toHaveClass("text-[#6653fb]");
        await user.click(screen.getByRole("button", { name: "거의 새 상품" }));
        await user.click(screen.getByRole("button", { name: "일부 포함" }));
        await user.click(screen.getByRole("button", { name: "택배 거래" }));
        await user.click(screen.getByRole("button", { name: "배송비 포함" }));
        await user.click(screen.getByRole("button", { name: /AI 판매 글 만들기/ }));

        expect(mutate).toHaveBeenCalledWith({
            images: [expect.any(File)],
            condition: "A",
            includedStatus: "PARTIAL",
            tradeMethod: "DELIVERY",
            deliveryType: "INCLUDED",
            deliveryFee: null,
            preferredTradeRegion: null,
        });
        expect(
            screen.queryByRole("heading", { name: "판매 글을 만들었어요" }),
        ).not.toBeInTheDocument();
        expect(screen.getByRole("heading", { name: "판매 글이 등록되었어요" })).toBeInTheDocument();
        expect(screen.getByText("상품 등록 완료")).toBeInTheDocument();
        expect(screen.getByRole("button", { name: "확인하러 가기" })).toBeInTheDocument();

        await user.click(screen.getByRole("button", { name: "확인하러 가기" }));

        expect(push).toHaveBeenCalledWith("/sell/manage/17?method=ai");
    });
});
