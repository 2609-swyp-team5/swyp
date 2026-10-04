import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { mutate, push, reset } = vi.hoisted(() => ({
    mutate: vi.fn(),
    push: vi.fn(),
    reset: vi.fn(),
}));

vi.mock("next/navigation", () => ({
    useRouter: () => ({ push }),
}));

vi.mock("@/features/sell/hooks/mutations/useDeleteProductMutation", () => ({
    useDeleteProductMutation: () => ({
        error: null,
        isPending: false,
        mutate: vi.fn(),
        reset,
    }),
}));

vi.mock("@/features/sell/hooks/mutations/useUpdateProductStatusMutation", () => ({
    useUpdateProductStatusMutation: () => ({
        error: null,
        isPending: false,
        mutate,
        reset,
    }),
}));

import { ProductSummaryActions } from "./ProductSummaryActions";

describe("ProductSummaryActions", () => {
    beforeEach(() => {
        mutate.mockReset();
        push.mockReset();
        reset.mockReset();
    });

    it("판매중인 상품에 판매완료 버튼을 표시하고 상태 변경을 요청한다", async () => {
        const user = userEvent.setup();

        render(
            <ProductSummaryActions
                product={{ id: 42 }}
                editHref="/sell/manage/42/edit"
                canMarkAsSold
            />,
        );

        await user.click(screen.getByRole("button", { name: "판매완료" }));
        expect(screen.getByRole("heading", { name: "판매완료로 변경할까요?" })).toBeVisible();

        const confirmButton = screen
            .getAllByRole("button", { name: "판매완료" })
            .find((button) => button.closest('[role="alertdialog"]'));
        expect(confirmButton).toBeDefined();
        await user.click(confirmButton!);

        expect(mutate).toHaveBeenCalledWith(
            { id: 42, status: "SOLD_OUT" },
            expect.objectContaining({ onSuccess: expect.any(Function) }),
        );
    });

    it("판매완료 상태 변경이 불가능한 상품에는 버튼을 표시하지 않는다", () => {
        render(<ProductSummaryActions product={{ id: 42 }} editHref="/sell/manage/42/edit" />);

        expect(screen.queryByRole("button", { name: "판매완료" })).not.toBeInTheDocument();
    });
});
