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
        onPurchasePeriodChange,
        onOperationStatusChange,
        onIncludedItemChange,
        children,
    }: {
        onPurchasePeriodChange: (value: "unknown") => void;
        onOperationStatusChange: (value: "issues") => void;
        onIncludedItemChange: (value: string, checked: boolean) => void;
        children: ReactNode;
    }) => (
        <div>
            <button type="button" onClick={() => onPurchasePeriodChange("unknown")}>
                구매 시기 미상
            </button>
            <button type="button" onClick={() => onOperationStatusChange("issues")}>
                일부 문제 있음
            </button>
            <button type="button" onClick={() => onIncludedItemChange("box", true)}>
                박스 추가
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

        await user.click(screen.getByRole("button", { name: "테스트 사진 추가" }));
        await user.click(screen.getByRole("button", { name: "다음단계" }));
        await user.click(screen.getByRole("button", { name: "구매 시기 미상" }));
        await user.click(screen.getByRole("button", { name: "일부 문제 있음" }));
        await user.click(screen.getByRole("button", { name: "박스 추가" }));
        await user.click(screen.getByRole("button", { name: /AI 판매 글 만들기/ }));

        expect(mutate).toHaveBeenCalledWith({
            images: [expect.any(File)],
            purchasedMonths: null,
            operationStatus: "issues",
            includedItems: ["body", "charging-cable", "box"],
        });
        expect(screen.getByRole("heading", { name: "판매 글을 만들었어요" })).toBeInTheDocument();

        await user.click(screen.getByRole("button", { name: "확인하러 가기" }));

        expect(push).toHaveBeenCalledWith("/sell/manage/17?method=ai");
    });
});
